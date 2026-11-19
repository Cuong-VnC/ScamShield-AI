"""Đọc biến môi trường cho backend ScamShield-AI.

- Local: biến lấy từ file `.env` ở thư mục gốc repo (mẫu: `.env.example`).
  `load_dotenv()` tìm `.env` từ thư mục chứa file này đi ngược lên các thư mục
  cha, nên chạy từ thư mục nào cũng được. Biến đã có sẵn trong môi trường
  (ví dụ trên Render) KHÔNG bị `.env` ghi đè.
- Render: khai báo trong Dashboard > Environment, không cần file `.env`.

Tên biến Supabase chuẩn là `SUPABASE_URL` / `SUPABASE_KEY`. Tên cũ
`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_KEY` (tiền tố của Expo,
không hợp với backend) vẫn được đọc khi tên chuẩn để trống, để cấu hình Render
hiện có không bị ảnh hưởng.
"""
import base64
import json
import os

from dotenv import load_dotenv

load_dotenv()

# (tên chuẩn, tên cũ vẫn được chấp nhận)
SUPABASE_URL_VARS = ("SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_URL")
SUPABASE_KEY_VARS = ("SUPABASE_KEY", "EXPO_PUBLIC_SUPABASE_KEY")


def get_env(*names):
    """Giá trị khác rỗng đầu tiên trong các biến `names` (theo thứ tự), hoặc None."""
    for name in names:
        value = (os.getenv(name) or "").strip()
        if value:
            return value
    return None


def get_supabase_config():
    """Trả (url, key) của Supabase; phần nào chưa cấu hình thì là None."""
    return get_env(*SUPABASE_URL_VARS), get_env(*SUPABASE_KEY_VARS)


def supabase_key_kind(key):
    """Loại API key Supabase, chỉ để ghi log — KHÔNG trả/in giá trị key.

    'publishable' (sb_publishable_…, khuyên dùng cho backend), 'secret' (sb_secret_…),
    'anon' / 'service_role' (legacy JWT: đọc claim `role`, không xác minh chữ ký),
    'jwt' (JWT không rõ role), 'unknown', hoặc None nếu key rỗng.
    """
    if not key:
        return None
    if key.startswith("sb_publishable_"):
        return "publishable"
    if key.startswith("sb_secret_"):
        return "secret"
    parts = key.split(".")
    if len(parts) == 3:
        try:
            payload = parts[1] + "=" * (-len(parts[1]) % 4)
            role = json.loads(base64.urlsafe_b64decode(payload)).get("role")
        except Exception:
            role = None
        return role if role in ("anon", "service_role") else "jwt"
    return "unknown"
