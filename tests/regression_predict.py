#!/usr/bin/env python3
"""Q-01 — Chạy hồi quy bộ URL kiểm thử chuẩn với API /predict của ScamShield-AI.

Đọc tests/fixtures/urls.json, gọi POST /predict cho từng URL, so sánh
`status` trả về với `expected` trong fixture và in bảng kết quả.

Luật so sánh:
- expected "Safe" / "Phishing" / "DomainNotFound": status phải khớp đúng.
- expected "not_safe": status không được là "Safe"
  (chấp nhận "Phishing" hoặc "DomainNotFound" — dùng cho URL mạo danh /
  homoglyph chưa xác minh: tên miền chết thì API trả DomainNotFound là đúng,
  tên miền còn sống mà là lừa đảo thì phải trả Phishing; chỉ có "Safe" là sai).

Ví dụ chạy (đứng ở thư mục gốc của repo):
    python3 tests/regression_predict.py
    python3 tests/regression_predict.py --category dead
    python3 tests/regression_predict.py --ids LV-01,D-01 --output ket-qua.json
    python3 tests/regression_predict.py --dry-run        # chỉ kiểm tra fixture
    python3 tests/regression_predict.py --base-url http://localhost:8000

Lưu ý:
- Chỉ dùng thư viện chuẩn (urllib) nên không cần pip install gì thêm.
- Render free tier ngủ đông: request đầu tiên có thể mất > 90s (timeout
  mặc định 120s). Mỗi lần quét ~6-12s nên 50 URL mất khoảng 8-10 phút.
- Backend đang dùng chung 1 bucket rate limit cho mọi người (B-02), nên
  script chạy tuần tự và nghỉ 1s giữa các request; gặp 429/503 thì tự
  thử lại sau vài giây.
- Exit code: 0 khi mọi case đều PASS, 1 khi có FAIL hoặc ERROR.
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

DEFAULT_BASE_URL = "https://scamshield-ai-be.onrender.com"
DEFAULT_TIMEOUT = 120          # giây — request đầu sau cold start Render rất lâu
DEFAULT_DELAY = 1.0            # giây nghỉ giữa 2 request (tránh 429)
DEFAULT_RETRIES = 2            # số lần thử lại khi gặp 429 / 503 / timeout


def load_fixtures(fixtures_path: Path) -> dict:
    with fixtures_path.open(encoding="utf-8") as f:
        data = json.load(f)
    cases = data["cases"]
    ids = [c["id"] for c in cases]
    if len(ids) != len(set(ids)):
        dup = [i for i, n in Counter(ids).items() if n > 1]
        raise ValueError(f"Trùng ID trong fixture: {dup}")
    for c in cases:
        if c["expected"] not in ("Safe", "Phishing", "DomainNotFound", "not_safe"):
            raise ValueError(f"{c['id']}: expected không hợp lệ: {c['expected']!r}")
    return data


def matches(expected: str, actual: str | None) -> bool:
    if expected == "not_safe":
        return actual is not None and actual != "Safe"
    return actual == expected


def predict_once(base_url: str, url: str, timeout: int) -> dict:
    """Gọi 1 lần POST /predict. Trả về dict, hoặc raise để caller retry."""
    req = urllib.request.Request(
        base_url.rstrip("/") + "/predict",
        data=json.dumps({"url": url}).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    t0 = time.monotonic()
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    return {"http": resp.status, "ms": int((time.monotonic() - t0) * 1000), **body}


def predict_with_retry(base_url: str, url: str, timeout: int, retries: int) -> dict:
    last_error = None
    for attempt in range(retries + 1):
        try:
            return predict_once(base_url, url, timeout)
        except urllib.error.HTTPError as e:  # 429 / 503 / 500...
            last_error = f"HTTP {e.code}"
            if e.code in (429, 503) and attempt < retries:
                time.sleep(5 * (attempt + 1))
                continue
            return {"error": last_error}
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            last_error = f"network/timeout: {e}"
            if attempt < retries:
                time.sleep(5 * (attempt + 1))
                continue
            return {"error": last_error}
        except (ValueError, KeyError) as e:  # JSON trả về không đọc được
            return {"error": f"bad response: {e}"}
    return {"error": last_error or "unknown error"}


def main() -> int:
    here = Path(__file__).resolve()
    repo_root = here.parent.parent  # tests/regression_predict.py -> repo root
    default_fixtures = repo_root / "tests" / "fixtures" / "urls.json"

    ap = argparse.ArgumentParser(description="Q-01: hồi quy /predict với bộ URL chuẩn.")
    ap.add_argument("--base-url", default=DEFAULT_BASE_URL)
    ap.add_argument("--fixtures", default=str(default_fixtures))
    ap.add_argument("--category", help="chỉ chạy 1 nhóm, vd: dead, legit_vn, homoglyph")
    ap.add_argument("--ids", help="chỉ chạy các ID, cách nhau bằng dấu phẩy, vd: LV-01,D-01")
    ap.add_argument("--limit", type=int, help="giới hạn số case (chạy thử nhanh)")
    ap.add_argument("--delay", type=float, default=DEFAULT_DELAY)
    ap.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    ap.add_argument("--retries", type=int, default=DEFAULT_RETRIES)
    ap.add_argument("--output", help="ghi kết quả chi tiết ra file JSON")
    ap.add_argument("--dry-run", action="store_true", help="chỉ kiểm tra fixture, không gọi API")
    args = ap.parse_args()

    try:
        data = load_fixtures(Path(args.fixtures))
    except (OSError, ValueError, KeyError) as e:
        print(f"Lỗi đọc fixture {args.fixtures}: {e}", file=sys.stderr)
        return 1

    cases = data["cases"]
    if args.category:
        cases = [c for c in cases if c["category"] == args.category]
    if args.ids:
        wanted = {i.strip() for i in args.ids.split(",")}
        cases = [c for c in cases if c["id"] in wanted]
    if args.limit:
        cases = cases[: args.limit]
    if not cases:
        print("Không có case nào khớp bộ lọc.", file=sys.stderr)
        return 1

    print(f"Fixtures: {args.fixtures} — {len(cases)} case"
          f"{' (dry-run, không gọi API)' if args.dry_run else ''}")
    if not args.dry_run:
        print(f"API: {args.base_url}/predict (timeout {args.timeout}s, "
              f"nghỉ {args.delay}s/case)")
    print(f"{'ID':<7}{'Nhóm':<15}{'Kỳ vọng':<15}{'Thực tế':<16}{'Prob':<7}{'Kết quả'}")
    print("-" * 78)

    results = []
    counts = Counter()
    per_category = defaultdict(Counter)
    for c in cases:
        if args.dry_run:
            result = {"id": c["id"], "verdict": "SKIP (dry-run)"}
            print(f"{c['id']:<7}{c['category']:<15}{c['expected']:<15}"
                  f"{'-':<16}{'-':<7}SKIP")
        else:
            res = predict_with_retry(args.base_url, c["url"], args.timeout, args.retries)
            if "error" in res:
                verdict = "ERROR"
                got, prob, source = res["error"], "-", "-"
            else:
                got = res.get("status")
                prob = res.get("probability")
                source = res.get("source", "-")
                verdict = "PASS" if matches(c["expected"], got) else "FAIL"
            prob_str = "-" if prob is None else f"{prob:.2f}"
            print(f"{c['id']:<7}{c['category']:<15}{c['expected']:<15}"
                  f"{str(got)[:15]:<16}{prob_str:<7}{verdict}")
            result = {"id": c["id"], "url": c["url"], "category": c["category"],
                      "expected": c["expected"], "actual": got,
                      "probability": prob, "risk_level": res.get("risk_level"),
                      "source": source if "error" not in res else None,
                      "ms": res.get("ms"), "error": res.get("error"),
                      "verdict": verdict}
            time.sleep(args.delay)
        counts[result["verdict"]] += 1
        per_category[c["category"]][result["verdict"]] += 1
        results.append(result)

    print("-" * 78)
    for cat in sorted(per_category):
        cc = per_category[cat]
        print(f"  {cat:<15} PASS {cc['PASS']}  FAIL {cc['FAIL']}  "
              f"ERROR {cc['ERROR']}  SKIP {cc['SKIP (dry-run)']}")
    total = len(results)
    passed = counts["PASS"]
    print(f"Tổng: {total} case — PASS {passed} ({passed * 100 // total}%), "
          f"FAIL {counts['FAIL']}, ERROR {counts['ERROR']}")
    failed = [r for r in results if r["verdict"] in ("FAIL", "ERROR")]
    if failed:
        print("Cần xem lại:")
        for r in failed:
            detail = r.get("error") or (
                f"kỳ vọng {r['expected']}, thực tế {r['actual']} "
                f"(prob {r['probability']}, source {r['source']})")
            print(f"  - {r['id']} {r['url']}: {detail}")

    if args.output:
        with Path(args.output).open("w", encoding="utf-8") as f:
            json.dump({"base_url": args.base_url, "total": total,
                       "summary": dict(counts), "results": results},
                      f, ensure_ascii=False, indent=2)
        print(f"Đã ghi kết quả chi tiết: {args.output}")

    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
