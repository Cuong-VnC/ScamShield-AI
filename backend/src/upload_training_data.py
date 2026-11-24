import pandas as pd
from supabase import create_client, Client

from env_config import get_supabase_config


def get_supabase_client() -> Client:
    """Tạo client từ SUPABASE_URL / SUPABASE_KEY (xem env_config.py, .env.example).
    Script này GHI vào bảng url_cache nên key phải có quyền insert/update."""
    url, key = get_supabase_config()
    if not url or not key:
        raise SystemExit("❌ Thiếu SUPABASE_URL hoặc SUPABASE_KEY. Điền vào file .env "
                         "ở thư mục gốc repo (mẫu: .env.example) rồi chạy lại.")
    return create_client(url, key)


def upload_csv_to_supabase(file_path: str):
    supabase = get_supabase_client()
    print(f"📂 Đang đọc file: {file_path}")

    # Đọc CSV
    df = pd.read_csv(file_path)
    
    # --- MAPPING DỮ LIỆU TỪ ẢNH ---
    # Chuyển đổi cột 'Type' của bạn thành các cột mà API yêu cầu
    # Giả sử trong file của bạn: 'Phishing' -> 1.0 (High), 'Benign' -> 0.0 (Low)
    
    processed_data = []
    for _, row in df.iterrows():
        is_phishing = row['Type'].lower() == 'phishing'
        
        processed_data.append({
            "url": row['url'].strip().lower(),
            "type": row['Type'],
            "status": "Phishing" if is_phishing else "Safe",
            "probability": 1.0 if is_phishing else 0.0,
            "risk_level": "High" if is_phishing else "Low",
            "technical_report": {"source": "training_data_upload"}
        })

    # Chia nhỏ để upload (batch size 500)
    batch_size = 500
    for i in range(0, len(processed_data), batch_size):
        batch = processed_data[i : i + batch_size]
        try:
            supabase.table("url_cache").upsert(batch).execute()
            print(f"✅ Đã tải lên dòng {i} đến {i + len(batch)}")
        except Exception as e:
            print(f"❌ Lỗi tại dòng {i}: {e}")

if __name__ == "__main__":
    # Đổi tên này thành tên file CSV thật của bạn
    upload_csv_to_supabase("Phishing_URLs_Cleaned.csv")