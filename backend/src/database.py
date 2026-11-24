from os import getenv

from supabase import create_client, Client

from env_config import get_supabase_config, supabase_key_kind
from api_protection import log_failure, logger

# --- 1. LOAD CẤU HÌNH BIẾN MÔI TRƯỜNG ---
# SUPABASE_URL / SUPABASE_KEY (tên cũ EXPO_PUBLIC_SUPABASE_* vẫn được đọc), xem env_config.py
SUPABASE_URL, SUPABASE_KEY = get_supabase_config()

# supabase-py 2.34 (postgrest 2.x) mặc định chờ 120s/truy vấn và tự retry 3 lần
# (nghỉ 1+2+4s) khi lỗi mạng hoặc 503/520 -> /predict treo 7-15s, thậm chí vài phút,
# khi Supabase lỗi. Giữ hành vi fail-soft như bản 2.3.0: tối đa 5s, không retry.
# Backend không đăng nhập người dùng nên tắt luôn refresh/persist session.
# (Import/tạo trong khối try bên dưới: supabase-py cũ (2.3.0) không có ClientOptions ở
#  cấp gói / không có tham số retry -> chỉ tắt tầng DB, backend vẫn khởi động.)
DB_CLIENT_OPTIONS = dict(
    postgrest_client_timeout=5,
    postgrest_client_retry=False,
    auto_refresh_token=False,
    persist_session=False,
)

# --- 2. KHỞI TẠO KẾT NỐI ---
try:
    if not SUPABASE_URL or not SUPABASE_KEY:
        missing = [n for n, v in (("SUPABASE_URL", SUPABASE_URL), ("SUPABASE_KEY", SUPABASE_KEY)) if not v]
        logger.warning("supabase_disabled missing=%s", ",".join(missing))
        supabase: Client = None
    else:
        from supabase import ClientOptions

        key_kind = supabase_key_kind(SUPABASE_KEY)
        if key_kind in ("secret", "service_role"):
            logger.warning("supabase_key_privileged kind=%s", key_kind)
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY,
                                         options=ClientOptions(**DB_CLIENT_OPTIONS))
        logger.info("supabase_client_initialized key_kind=%s", key_kind)
except Exception as exc:
    log_failure("supabase_init_failed", exc)
    supabase = None

# --- 3. CÁC HÀM TRA CỨU DANH SÁCH ---

def fetch_public_stats():
    """Read storage totals using the public database role."""
    if supabase is None or supabase_key_kind(SUPABASE_KEY) not in ("publishable", "anon"):
        return None
    # Enable v1 only after reviewing its SQL for full-table counts, independent of caller RLS.
    use_v1 = getenv("SCAMSHIELD_STATS_V1_CONFIRMED", "").strip().lower() == "true"
    rpc = "scamshield_public_stats" if use_v1 else "scamshield_stored_stats"
    try:
        return supabase.rpc(rpc, get=True).execute().data
    except Exception as exc:
        log_failure("supabase_stats_lookup_failed", exc)
        return None


def check_url_in_db(url: str):
    """
    Kiểm tra URL có nằm trong danh sách Phishing hoặc Safe đã có sẵn không.
    Trả về dữ liệu nếu tìm thấy, ngược lại trả về None.
    """
    if not supabase:
        return None
        
    try:
        clean_url = url.strip().lower()
        
        # 1. Tra cứu trong bảng Phishing (Blacklist)
        res_phishing = supabase.table("phishing_urls").select("*").eq("url", clean_url).execute()
        if res_phishing.data and len(res_phishing.data) > 0:
            result = res_phishing.data[0]
            return {**result, "source": "database_blacklist"}
            
        # 2. Tra cứu trong bảng Safe (Whitelist)
        res_safe = supabase.table("safe_urls").select("*").eq("url", clean_url).execute()
        if res_safe.data and len(res_safe.data) > 0:
            result = res_safe.data[0]
            return {**result, "source": "database_whitelist"}
            
        return None
    except Exception as exc:
        log_failure("supabase_lookup_failed", exc)
        return None
