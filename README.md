# ScamShield-AI — Phòng chống lừa đảo trực tuyến

Website giúp người dùng kiểm tra **đường link, số điện thoại, số tài khoản và tin nhắn** đáng ngờ, kèm giải
thích vì sao, cảnh báo thủ đoạn mới, hướng dẫn xử lý khi bị lừa và khoá đào tạo có chứng nhận.

Kiểm tra đường link dùng **model AI đã train** (CNN+BiLSTM xếp chồng XGBoost, pipeline v8, 41 đặc trưng + 128
đặc trưng TF-IDF/SVD). Backend tra cứu thêm thông tin thật của tên miền (DNS, WHOIS, TLS, HTTP).

**ScamShield AI** is an AI-powered scam detection and awareness platform designed to help individuals and
small businesses identify potential scams, analyze suspicious content, and improve cybersecurity awareness.

> Dự án học tập (nhóm ICTLab, USTH). Kết quả chỉ mang tính tham khảo — luôn cẩn trọng trước khi nhập mật
> khẩu, mã OTP hay chuyển tiền trên bất kỳ trang web nào.

**Web:** https://gaost25uytingiare.vercel.app/ · **API:** https://scamshield-ai-be.onrender.com/health

`https://kiemtratenmien.vercel.app/` là bản thử nghiệm cũ, không còn dùng.

Lưu ý: server có thể phải khởi động lại sau 5–10 phút không dùng, nên phải chờ server chạy lại mới gửi link được.

## Train model

Notebook train nằm ở [Train model/code/code/train-model-url-v8.ipynb](Train%20model/code/code/train-model-url-v8.ipynb).
Dataset (bản v6 + benchmark): https://huggingface.co/datasets/BHugvh/dataset_train_url — tải về rồi up lên
Kaggle để train. Sau khi train, chép 7 file model vào `backend/models/` (xem [docs/MODEL-V8-DEPLOY-REPORT.md](docs/MODEL-V8-DEPLOY-REPORT.md)).

## Cách quét một đường link

1. **Bộ quy tắc trên trình duyệt** ([js/url-analyzer.js](js/url-analyzer.js)) chạy ngay: tách cấu trúc URL
   (tên miền phụ / chính / đuôi / đường dẫn) và liệt kê các dấu hiệu (F1 cấu trúc, F2 từ khoá, F4 giả mạo
   thương hiệu) dạng thanh đóng góp.
2. **Model AI** ở backend (`POST /predict`) đưa ra **kết luận và xác suất cuối cùng**, kèm thông tin tên miền
   chi tiết và cảnh báo khi tên miền không tồn tại / không hoạt động.
3. Nếu backend lỗi hoặc quá chậm (90 giây), trang giữ kết quả của bộ quy tắc và ghi chú rõ cho người dùng.
   Link nằm trong danh sách đen / báo cáo của cộng đồng luôn bị đánh dấu nguy hiểm.

Trang **Tin nhắn** gửi tối đa 3 đường link tìm thấy trong tin nhắn lên model AI (chỉ gửi link, không gửi nội
dung tin nhắn). Số điện thoại và số tài khoản vẫn kiểm tra trên trình duyệt.

## Cấu trúc repo

```
├── index.html, tin-nhan.html, canh-bao.html,   # Giao diện (web tĩnh, không cần build)
│   dao-tao.html, ung-pho.html, bao-cao.html
├── css/style.css
├── js/
│   ├── api.js           # Gọi backend model AI (/predict, /health)
│   ├── scan.js          # Gộp kết quả AI + bộ quy tắc, vẽ kết quả + chi tiết tên miền
│   ├── url-analyzer.js  # Bộ phân tích URL trên trình duyệt (giải thích / dự phòng)
│   ├── home.js, message.js, ...  # Logic từng trang
├── backend/
│   ├── models/          # 7 artifacts model v8: phishing_nn.keras, xgb_model.json, tokenizer.json,
│   │                    # scaler.pkl, tfidf_f2.pkl, svd_f2.pkl, meta.json
│   └── src/
│       ├── main.py      # FastAPI: /predict, /health, /domain-info
│       ├── features.py  # 41 đặc trưng (thứ tự PHẢI khớp meta.json)
│       ├── domain_info.py, tfidf_compat.py, database.py
├── tests/               # Test backend (pytest)
├── docs/                # Báo cáo cải tiến / triển khai model
└── requirements.txt, .python-version
```

## Chạy local

```bash
# 1. Backend (Python 3.11 — tensorflow-cpu 2.16.1 chưa có bản cho Python mới hơn)
python -m venv .venv
.venv/bin/pip install -r requirements.txt          # Windows: .venv\Scripts\pip
.venv/bin/uvicorn backend.src.main:app --port 8000

# 2. Giao diện (thư mục gốc repo)
python -m http.server 8080
# Mở http://localhost:8080 — trang tự gọi API ở http://localhost:8000
```

Địa chỉ backend mà giao diện dùng:

| Trang mở từ | Backend |
| --- | --- |
| `localhost`, `127.0.0.1`, `file://` | `http://localhost:8000` |
| nơi khác | `https://scamshield-ai-be.onrender.com` (sửa `DEFAULT_API` trong [js/api.js](js/api.js)) |
| bất kỳ, thêm `?api=https://...` | địa chỉ đó (được nhớ trong trình duyệt; `?api=reset` để xoá) |

Kiểm tra nhanh backend:

```bash
curl http://localhost:8000/health
curl -X POST http://localhost:8000/predict -H 'Content-Type: application/json' -d '{"url": "https://www.google.com"}'
```

## Cấu hình backend (biến môi trường)

| Biến | Mô tả |
| --- | --- |
| `PORT` | Cổng backend (mặc định `8000`; Render tự đặt). |
| `URLHAUS_API_KEY` | (Tuỳ chọn) Khoá URLhaus. |
| `GOOGLE_SAFE_BROWSING_API_KEY` | (Tuỳ chọn) Khoá Google Safe Browsing. |
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_KEY` | (Tuỳ chọn) Supabase cho danh sách đen/trắng nội bộ. |

Chi tiết API (`/predict`, `/domain-info`, các giá trị `status`) xem
[docs/IMPROVEMENT-REPORT.md](docs/IMPROVEMENT-REPORT.md) và [docs/MODEL-V8-DEPLOY-REPORT.md](docs/MODEL-V8-DEPLOY-REPORT.md).

## Triển khai

- **Backend (Render):** start command `uvicorn backend.src.main:app --host 0.0.0.0 --port $PORT`,
  đặt `PYTHON_VERSION=3.11.9`.
- **Giao diện:** host tĩnh thư mục gốc trên Vercel (https://gaost25uytingiare.vercel.app/). Backend đã bật CORS
  cho mọi origin.

### Docker

```bash
docker build -t scamshield-api .
docker run --rm -p 8000:8000 --env-file .env scamshield-api
curl http://localhost:8000/health        # {"status":"ok","models_loaded":true,...}
```

Image chỉ chứa `backend/` + `requirements.txt` (`tensorflow-cpu`), chạy bằng user không phải root, có `HEALTHCHECK`,
dùng biến `PORT` nên deploy được lên Render dạng Docker. Không đưa `.env` vào image.

### CI (GitHub Actions)

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) chạy cho mỗi PR và khi push lên `main` / `fe`:

- **Backend:** Python 3.11, `compileall`, `pytest tests/`, khởi động uvicorn rồi kiểm tra `/health`
  (`models_loaded=true`) và `POST /predict` trả 200.
- **Frontend:** `node --check js/*.js`, phục vụ thư mục gốc, kiểm tra trang chính, `api.js` và mọi file JS/CSS
  mà HTML tham chiếu.
- **Docker:** build image, chạy container, chờ `/health` báo model đã nạp.

Job nào lỗi thì PR đỏ. Nên bật *Branch protection → Require status checks* cho `main`.

### Giảm cold start của Render

Render miễn phí cho server ngủ sau ~15 phút không có request (lần gọi đầu mất 30–90 giây).
[`.github/workflows/keep-render-warm.yml`](.github/workflows/keep-render-warm.yml) ping `/health` mỗi 10 phút và
ghi thời gian phản hồi vào trang tóm tắt của mỗi lần chạy.

- Lịch chạy **chỉ có hiệu lực trên nhánh mặc định (`main`)**.
- Đổi URL bằng biến repo `RENDER_HEALTH_URL` (Settings → Secrets and variables → Actions → Variables).
- GitHub có thể trễ lịch; nếu vẫn bị cold start, thêm UptimeRobot / cron-job.org ping `/health` 5 phút/lần hoặc
  dùng gói Render trả phí.

### Tên miền & HTTPS

- Vercel tự cấp TLS và chuyển `http://` → `https://` (308, có HSTS).
- Gắn tên miền riêng: Vercel → Project → Settings → Domains; tại DNS tạo `CNAME www → cname.vercel-dns.com`
  (domain gốc dùng bản ghi `A` theo hướng dẫn Vercel), rồi cập nhật link ở đầu README.
- Bản cũ `kiemtratenmien.vercel.app`: xoá project đó trên Vercel hoặc thêm redirect sang domain chính.

## Nguồn dữ liệu

PhishVN – Mendeley Data v4 (CC BY 4.0) · PhiUSIIL – UCI #967 (CC BY 4.0).
