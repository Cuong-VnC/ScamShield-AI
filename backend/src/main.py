import os
import sys
import json
import logging
import pickle
import requests
import re
from urllib.parse import urlparse
from threading import Lock
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

# --- CẤU HÌNH KERAS ---
os.environ["KERAS_BACKEND"] = "tensorflow"

# Thiết lập đường dẫn
SRC_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SRC_DIR)
MODEL_DIR = os.path.join(BACKEND_DIR, "models")
if SRC_DIR not in sys.path: sys.path.insert(0, SRC_DIR)

from features import (extract_features, registrable_domain, get_advanced_insights,
                      load_tokenizer_json, texts_to_char_sequences, pad_post, FEATURE_NAMES,
                      skeletonize, f2_doc)
from tfidf_compat import repair_tfidf_idf
import env_config  # noqa: F401 — nạp .env (local) trước khi đọc URLHAUS_API_KEY / GOOGLE_SAFE_BROWSING_API_KEY
from database import check_url_in_db
from domain_info import get_domain_info, resolve_dns
from network_safety import UnsafeTarget, public_addresses
from api_protection import ApiError, RequestProtection, analysis_slot, error_response, log_failure, logger
from public_stats import router as stats_router

app = FastAPI()
app.add_middleware(RequestProtection)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(stats_router)

# Access logs include the query string. RequestProtection logs fixed routes and IDs.
logging.getLogger("uvicorn.access").disabled = True
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.ERROR)
_inference_lock = Lock()


@app.exception_handler(ApiError)
async def handle_api_error(_, exc):
    return error_response(exc.status_code, exc.detail, exc.code, exc.headers)


@app.exception_handler(RequestValidationError)
async def handle_validation_error(_, exc):
    # Keep FastAPI's detail array without the raw request input or validator context.
    detail = [{"loc": error["loc"], "type": error["type"], "msg": "Invalid request"}
              for error in exc.errors()]
    return error_response(422, detail, "INVALID_REQUEST")


# Load Models (pipeline notebook dataset_url_06 v8: NN -> XGBoost stack 170 cot)
# 7 artifacts trong backend/models: phishing_nn.keras, xgb_model.json,
# tokenizer.json, scaler.pkl, tfidf_f2.pkl, svd_f2.pkl, meta.json
model_nn = None
model_xgb = None
tokenizer_index = None  # (word_index, oov_index)
tokenizer_oov = None
scaler = None
tfidf_f2 = None
svd_f2 = None
META = {"threshold": 0.45, "max_len": 200, "trusted_domains": set(), "feature_names": FEATURE_NAMES}


def load_all_models():
    global np, model_nn, model_xgb, tokenizer_index, tokenizer_oov, scaler, META, tfidf_f2, svd_f2
    try:
        import numpy as np
        import xgboost as xgb
        from keras.models import load_model

        with open(os.path.join(MODEL_DIR, "meta.json"), encoding="utf-8") as f:
            meta = json.load(f)
        META = {
            "threshold": float(meta.get("threshold", 0.45)),
            "max_len": int(meta.get("max_len", 200)),
            "trusted_domains": set(meta.get("trusted_domains", [])),
            "feature_names": meta.get("feature_names", FEATURE_NAMES),
        }
        if len(META["feature_names"]) != 41:
            logger.warning("model_feature_count expected=41 actual=%d", len(META["feature_names"]))
        tokenizer_index, tokenizer_oov = load_tokenizer_json(os.path.join(MODEL_DIR, "tokenizer.json"))
        with open(os.path.join(MODEL_DIR, "scaler.pkl"), "rb") as f:
            scaler = pickle.load(f)
        with open(os.path.join(MODEL_DIR, "tfidf_f2.pkl"), "rb") as f:
            tfidf_f2 = pickle.load(f)
        # Pickle lưu bằng sklearn 1.6.1 (Kaggle) nhưng Render chạy sklearn
        # 1.3.2: vector idf nằm trong __dict__['idf_'] mà bản 1.3.2 không đọc
        # được (đọc qua _idf_diag) -> transform() lỗi "idf vector is not
        # fitted". Dựng lại _idf_diag từ mảng idf đã lưu (no-op trên 1.6.1).
        if not repair_tfidf_idf(tfidf_f2):
            logger.warning("tfidf_repair_failed")
            return False
        with open(os.path.join(MODEL_DIR, "svd_f2.pkl"), "rb") as f:
            svd_f2 = pickle.load(f)
        model_xgb = xgb.XGBClassifier()
        model_xgb.load_model(os.path.join(MODEL_DIR, "xgb_model.json"))
        model_nn = load_model(os.path.join(MODEL_DIR, "phishing_nn.keras"))
        logger.info("model_v8_loaded threshold=%s whitelist_size=%d",
                    META["threshold"], len(META["trusted_domains"]))
        return True
    except Exception as exc:
        log_failure("model_load_failed", exc, level=logging.ERROR)
        return False


load_all_models()


def _models_loaded():
    return all(model is not None for model in
               (model_nn, model_xgb, tokenizer_index, scaler, tfidf_f2, svd_f2))


@app.get("/health")
async def health():
    """Liveness của tiến trình và trạng thái model, giữ HTTP 200 cho Render."""
    loaded = _models_loaded()
    return {"status": "ok" if loaded else "degraded",
            "models_loaded": loaded,
            "threshold": META["threshold"]}


def _require_public_target(host, dns_result):
    """Reject blocked destinations before analysis. Probes use this DNS snapshot."""
    status, records = dns_result
    try:
        if status == "blocked":
            raise UnsafeTarget("non-public address")
        public_addresses(host, records)
    except UnsafeTarget:
        raise ApiError(400, "URL blocked for security reasons", "URL_BLOCKED") from None


# --- ✅ VALIDATION ĐỊNH DẠNG URL (lỗi nhập liệu rõ ràng, riêng với lỗi SSRF) ---
def validate_url_format(url: str):
    """Trả (True, '') nếu định dạng OK, ngược lại (False, lý do tiếng Việt)."""
    try:
        parsed = urlparse(url)
    except Exception:
        return False, "không phân tích được URL"
    if parsed.scheme not in ("http", "https"):
        return False, "URL phải bắt đầu bằng http:// hoặc https://"
    host = parsed.hostname
    if not host:
        return False, "thiếu tên miền (hostname)"
    if len(host) > 253 or any(len(p) > 63 for p in host.split(".")):
        return False, "tên miền quá dài"
    if not re.fullmatch(r"[A-Za-z0-9._\-:\[\]]+", host):
        return False, "tên miền chứa ký tự không hợp lệ"
    if "." not in host and not re.fullmatch(r"\d+\.\d+\.\d+\.\d+", host) and ":" not in host:
        return False, "tên miền thiếu phần mở rộng (ví dụ: .com, .vn)"
    try:
        port = parsed.port
    except ValueError:
        return False, "cổng (port) không hợp lệ"
    if port is not None and not (1 <= port <= 65535):
        return False, "cổng (port) ngoài khoảng 1-65535"
    return True, ""


def _normalize_target(raw):
    if not raw or len(raw) > 2048:
        raise ApiError(400, "URL invalid or too long", "INVALID_REQUEST")
    processed = raw.lower()
    if not re.match(r"^[a-z][a-z0-9+.-]*://", processed):
        processed = "http://" + processed
    ok, reason = validate_url_format(processed)
    if not ok:
        raise ApiError(400, f"URL không đúng định dạng: {reason}", "INVALID_URL")
    return processed


def _attach_domain_info(resp: dict, info: dict):
    """Thêm domain_info / domain_status / warning vào response, giữ nguyên
    mọi trường cũ (frontend cũ và deployment hiện tại không vỡ)."""
    resp["domain_info"] = info
    resp["domain_status"] = info.get("status", "unknown")
    resp["warning"] = None
    if info.get("status") == "inactive":
        if (info.get("dns") or {}).get("status") == "no_answer":
            resp["warning"] = (
                "Tên miền tồn tại nhưng không có bản ghi DNS trỏ tới máy chủ web "
                "(không có A/AAAA) — tên miền có thể đã ngừng hoạt động."
            )
        else:
            resp["warning"] = (
                "Tên miền phân giải được DNS nhưng không phản hồi HTTP(S) — "
                "tên miền có thể đã ngừng hoạt động hoặc đang chặn truy cập."
            )
    elif info.get("status") == "unknown":
        resp["warning"] = (
            "Không kiểm tra được trạng thái hoạt động của tên miền "
            "(DNS/HTTP không phản hồi) — kết quả AI vẫn được hiển thị."
        )
    return resp


@app.get("/domain-info")
def domain_info_endpoint(url: str = ""):
    """Kiểm tra chi tiết tên miền: DNS / WHOIS / TLS / HTTP (fail-soft)."""
    with analysis_slot():
        raw = url.strip()
        if not raw:
            raise ApiError(400, "Thiếu tham số url", "INVALID_REQUEST")
        processed = _normalize_target(raw)
        host = urlparse(processed).hostname
        dns_result = resolve_dns(host)
        _require_public_target(host, dns_result)
        return {"url": raw, "domain_info": get_domain_info(processed, dns_result=dns_result)}


class URLRequest(BaseModel):
    url: str
    @field_validator('url')
    @classmethod
    def validate_input(cls, v):
        v = v.strip()
        if len(v) > 2048:
            raise ValueError("URL invalid or too long")
        v = re.sub(r'[<>\"\'\s]', '', v)
        if not v:
            raise ValueError("URL invalid or too long")
        return v


# --- 🔍 TẦNG TRUY VẤN: URLHAUS API (CHUYÊN DỤNG) ---
def check_urlhaus(url: str):
    """Truy vấn URLhaus API sử dụng Auth-Key bắt buộc."""
    api_key = os.getenv("URLHAUS_API_KEY")
    if not api_key:
        return None

    endpoint = "https://urlhaus-api.abuse.ch/v1/url/"
    headers = {'Auth-Key': api_key}
    data = {'url': url}

    try:
        response = requests.post(endpoint, data=data, headers=headers, timeout=5, allow_redirects=False)
        res_json = response.json()
        if res_json.get('query_status') == 'ok':
            return {
                "status": "Phishing/Malicious",
                "probability": 1.0,
                "risk_level": "High",
                "technical_report": {
                    "threat": res_json.get('threat', 'unknown'),
                    "urlhaus_reference": res_json.get('urlhaus_reference'),
                    "status": res_json.get('url_status')
                },
                "source": "urlhaus_database"
            }
        return None
    except (requests.RequestException, ValueError, AttributeError) as exc:
        log_failure("urlhaus_lookup_failed", exc)
        return None


# --- 🔍 TẦNG TRUY VẤN: GOOGLE SAFE BROWSING ---
def check_google_safe_browsing(url: str):
    api_key = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY")
    if not api_key: return None
    endpoint = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={api_key}"
    payload = {
        "client": {"clientId": "phishing-detector", "clientVersion": "1.0.0"},
        "threatInfo": {
            "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": url}]
        }
    }
    try:
        r = requests.post(endpoint, json=payload, timeout=5, allow_redirects=False)
        data = r.json()
        if "matches" in data:
            return {
                "status": "Phishing", "probability": 1.0, "risk_level": "High",
                "technical_report": {"threat_type": data["matches"][0]["threatType"]},
                "source": "google_safe_browsing"
            }
        return None
    except (requests.RequestException, ValueError, KeyError, IndexError, TypeError) as exc:
        log_failure("safe_browsing_lookup_failed", exc)
        return None


def predict_with_pipeline(url: str):
    """Đúng logic predict_url của notebook 08: whitelist -> 41 features ->
    scaler -> NN [seq(skeletonize), scaled] -> F2(skeletonize) -> XGBoost
    stack [nn_prob, 41 features, 128 F2] = 170 cột -> ngưỡng trong meta.json
    (0.45). Trả về (status, prob, nn_prob)."""
    u = str(url).strip().lower()
    rd = registrable_domain(u)
    if rd in META["trusted_domains"]:  # whitelist: so sánh domain đăng ký, không dùng substring
        return "Safe", 0.0, 0.0, "whitelist"
    skel = skeletonize(u)
    feats = np.array([extract_features(u)], dtype=np.float32)
    scaled = scaler.transform(feats)
    seq = pad_post(texts_to_char_sequences([skel], tokenizer_index, tokenizer_oov),
                   META["max_len"])
    nn_p = float(model_nn.predict([np.array(seq), scaled], verbose=0).ravel()[0])
    f2 = svd_f2.transform(tfidf_f2.transform([f2_doc(skel)])).astype(np.float32)
    stack = np.column_stack([[nn_p], scaled, f2])  # [nn_prob, 41 features, 128 F2] = 170 cột
    p = float(model_xgb.predict_proba(stack)[0][1])
    status = "Phishing" if p >= META["threshold"] else "Safe"
    return status, p, nn_p, "ai_analysis"


def normalize_db_record(record, raw_url):
    """Chuẩn hóa row Supabase về đúng shape chuẩn của API.
    check_url_in_db trả nguyên row DB (field không xác định) nên FE không đọc
    được -> hiển thị sai. Chỉ tin 2 nguồn đã biết; shape lạ thì trả None để
    rơi xuống các tầng sau thay vì trả verdict không rõ ràng."""
    if not isinstance(record, dict):
        return None
    source = record.get("source", "")
    if source == "database_blacklist":
        status, prob, risk = "Phishing", 1.0, "High"
    elif source == "database_whitelist":
        status, prob, risk = "Safe", 0.0, "Low"
    else:
        return None
    tr = record.get("technical_report")
    if not isinstance(tr, dict):
        tr = {}
    return {
        "url": record.get("url", raw_url),
        "status": status, "probability": prob, "risk_level": risk,
        "technical_report": {
            "domain_age": tr.get("domain_age", "N/A"),
            "dns_status": tr.get("dns_status", "Unknown"),
            "impersonation_risk": tr.get("impersonation_risk", "Low"),
            "is_shortened": bool(tr.get("is_shortened", False)),
        },
        "source": source,
    }


@app.post("/predict")
def predict(request: URLRequest):
    with analysis_slot():
        return _predict_url(request.url)


def _predict_url(raw_url):
    processed_url = _normalize_target(raw_url)

    # 1. DB Nội bộ (đã chuẩn hóa về shape chuẩn; shape lạ thì bỏ qua).
    #    Tra DB trước DNS: URL đã biết là phishing thì vẫn báo phishing
    #    dù tên miền đã chết.
    db_record = check_url_in_db(raw_url)
    if db_record:
        normalized = normalize_db_record(db_record, raw_url)
        if normalized:
            info = get_domain_info(processed_url)
            return _attach_domain_info(normalized, info)

    # 2. Tên miền có tồn tại không (DNS NXDOMAIN -> dừng sớm, không chạy model).
    host = urlparse(processed_url).hostname or ""
    dns_status, dns_records = resolve_dns(host)
    _require_public_target(host, (dns_status, dns_records))
    if dns_status == "nxdomain":
        info = get_domain_info(processed_url, dns_result=(dns_status, dns_records))
        age = info.get("whois", {}).get("age_days")
        return {
            "url": raw_url, "status": "DomainNotFound", "probability": None,
            "risk_level": "Unknown",
            "technical_report": {
                "domain_age": age if age is not None else "N/A",
                "dns_status": "No DNS record",
                "impersonation_risk": "Unknown",
                "is_shortened": False,
            },
            "domain_info": info, "domain_status": "nonexistent", "warning": None,
            "message": (f"Tên miền {info.get('domain') or host} không tồn tại "
                        "(DNS không phân giải được) — không thể truy cập."),
            "source": "domain_check",
        }

    # 3. Thông tin tên miền chi tiết (DNS/WHOIS/TLS/HTTP, fail-soft) — dùng
    #    chung cho mọi response bên dưới; đồng thời cho biết tên miền có đang
    #    hoạt động không (warning nếu inactive).
    info = get_domain_info(processed_url, dns_result=(dns_status, dns_records))

    # 4. URLhaus API (Chuyên dụng với Auth-Key)
    urlhaus_res = check_urlhaus(processed_url)
    if urlhaus_res: return _attach_domain_info(urlhaus_res, info)

    # 5. Google Safe Browsing
    google_res = check_google_safe_browsing(processed_url)
    if google_res: return _attach_domain_info(google_res, info)

    # 6. AI Analysis (pipeline v8)
    if not _models_loaded():
        raise ApiError(503, "Models not loaded", "MODEL_NOT_READY")
    try:
        with _inference_lock:
            status, prob, nn_prob, source = predict_with_pipeline(processed_url)

        if source == "whitelist":
            return _attach_domain_info({
                "url": raw_url, "status": status, "probability": 0.0, "risk_level": "Low",
                "technical_report": {
                    "domain_age": "N/A",
                    "dns_status": "Unknown",
                    "impersonation_risk": "Low",
                    "is_shortened": False
                },
                "source": "whitelist"
            }, info)

        adv = get_advanced_insights(processed_url, info)
        risk = "High" if prob >= 0.7 else ("Medium" if prob >= 0.4 else "Low")

        return _attach_domain_info({
            "url": raw_url, "status": status, "probability": round(prob, 4), "risk_level": risk,
            "technical_report": {
                "domain_age": adv.get('domain_age_days', "N/A"),
                "dns_status": adv.get('dns_status', "Unknown"),
                "impersonation_risk": adv.get('impersonation_risk', "Low"),
                "is_shortened": adv.get('is_shortened', False),
                "nn_probability": round(nn_prob, 4)
            },
            "source": "ai_analysis"
        }, info)
    except Exception as exc:
        log_failure("prediction_failed", exc, level=logging.ERROR)
        raise ApiError(500, "Internal server error", "INTERNAL_ERROR") from None

if __name__ == "__main__":
    import uvicorn
    import os
    # Lấy cổng từ hệ thống
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
