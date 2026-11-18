# ScamShield-AI — Kiểm tra đường link trước khi truy cập (bản redesign VI/EN)

Phiên bản giao diện mới của ScamShield-AI, tách từ `ScamShield-AI-fe`. Website chỉ còn hai trang:

- `index.html` — **quét URL**: model AI ở backend + bộ quy tắc trên trình duyệt, kèm giải thích và thông tin tên miền.
- `bao-cao.html` — **báo cáo đường link đáng ngờ** (lưu trên trình duyệt).

Giao diện song ngữ **Tiếng Việt / English** (nút cờ trên header), màu "Xanh mực" của dự án, header trắng,
footer xanh đen. Chi tiết thay đổi và kết quả kiểm thử: [REDESIGN_REPORT.md](REDESIGN_REPORT.md).

Kiểm tra đường link dùng **model AI đã train** (CNN+BiLSTM xếp chồng XGBoost, pipeline v8, 41 đặc trưng + 128
đặc trưng TF-IDF/SVD). Backend tra cứu thêm thông tin thật của tên miền (DNS, WHOIS, TLS, HTTP).

> Dự án học tập (nhóm ICTLab, USTH). Kết quả chỉ mang tính tham khảo — luôn cẩn trọng trước khi nhập mật
> khẩu, mã OTP hay chuyển tiền trên bất kỳ trang web nào.

## Chạy nhanh trên Windows

**Chỉ giao diện** (dùng backend Render công khai):

```powershell
cd ScamShield-AI-fe-redesign
python -m http.server 8080
# Mở http://localhost:8080/?api=https://phishing-ai-api.onrender.com
# (tham số ?api= được nhớ trong trình duyệt; mở http://localhost:8080/?api=reset để quay lại backend local)
```

**Giao diện + backend local** (cần **Python 3.11** vì `tensorflow-cpu==2.16.1` chưa hỗ trợ Python mới hơn):

```powershell
cd ScamShield-AI-fe-redesign
py -3.11 -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\uvicorn backend.src.main:app --port 8000      # cửa sổ 1: backend
python -m http.server 8080                                   # cửa sổ 2: giao diện
# Mở http://localhost:8080 — trang tự gọi API ở http://localhost:8000
```

Kiểm tra nhanh backend:

```powershell
curl.exe http://localhost:8000/health
curl.exe -X POST http://localhost:8000/predict -H "Content-Type: application/json" -d "{\"url\": \"https://www.google.com\"}"
```

Địa chỉ backend mà giao diện dùng (giữ nguyên cơ chế của bản FE, xem [js/api.js](js/api.js)):

| Trang mở từ | Backend |
| --- | --- |
| `localhost`, `127.0.0.1`, `file://` | `http://localhost:8000` |
| nơi khác | `https://phishing-ai-api.onrender.com` (sửa `DEFAULT_API` trong [js/api.js](js/api.js)) |
| bất kỳ, thêm `?api=https://...` | địa chỉ đó (được nhớ trong trình duyệt; `?api=reset` để xoá) |

Máy chủ Render miễn phí có thể ngủ sau một thời gian không dùng; lần đầu có thể mất tới khoảng một phút.
Trong lúc đó header hiện **"AI ngoại tuyến"** (màu cam) và tự kiểm tra lại; kết quả quét lúc này chỉ từ bộ quy tắc.

## Cách quét một đường link

1. **Bộ quy tắc trên trình duyệt** ([js/url-analyzer.js](js/url-analyzer.js)) chạy ngay: tách cấu trúc URL và
   liệt kê dấu hiệu (F1 cấu trúc, F2 từ khoá, F4 giả mạo thương hiệu) dạng thanh đóng góp — hiện như **kết quả sơ bộ**.
2. **Model AI** ở backend (`POST /predict`) đưa ra **kết luận và xác suất cuối cùng**, kèm thông tin tên miền.
3. Backend lỗi / quá chậm (90 giây): giữ kết quả bộ quy tắc, ghi rõ *chưa có kết quả model AI*, điểm hiển thị
   dạng `/100` và **không** gọi là xác suất AI. Có nút "Thử lại với model AI".
4. Link nằm trong danh sách đen mẫu hoặc đã được báo cáo trên trình duyệt này luôn bị đánh dấu nguy hiểm.

## Cấu trúc

```
├── index.html, bao-cao.html     # Hai trang (web tĩnh, không cần build)
├── css/style.css                # Giao diện (bảng màu Color 3 - Xanh mực, cố định, không dark mode)
├── js/
│   ├── language.js              # Từ điển VI/EN + dịch lý do, kết quả AI, lỗi backend
│   ├── common.js                # Header, footer, trạng thái AI, nút lên đầu trang, hiệu ứng
│   ├── api.js                   # Gọi backend model AI (/predict, /health)
│   ├── scan.js                  # Gộp kết quả AI + bộ quy tắc, vẽ kết quả + chi tiết tên miền
│   ├── home.js, report.js       # Logic trang quét / trang báo cáo
│   ├── url-analyzer.js, dictionaries.js, data.js   # Không đổi so với bản FE
├── backend/                     # FastAPI + 7 file model v8 (không đổi)
├── tests/                       # Test backend (pytest, không đổi)
├── docs/                        # Báo cáo cũ + redesign-screenshots/ (ảnh chụp kiểm thử)
└── requirements.txt, .python-version
```

## Dữ liệu lưu trên trình duyệt (localStorage)

| Key | Nội dung |
| --- | --- |
| `scamshield_language` | `vi` / `en` |
| `scamshield_url_history` | 6 lượt quét gần nhất `{url, level, score, ai, time}` |
| `scamshield_reports` | Báo cáo `{type: "url", target, category, desc, at}` (đọc được cả báo cáo cũ) |
| `scamshield_api_base` | Địa chỉ backend khi dùng `?api=` |

Chưa có backend nhận báo cáo — báo cáo **không** được gửi đi đâu, giao diện nói rõ điều này.

## Train model / cấu hình backend / triển khai

Giữ nguyên như bản FE:

- Notebook train: [Train model/code/code/train-model-url-v8.ipynb](Train%20model/code/code/train-model-url-v8.ipynb);
  dataset: https://huggingface.co/datasets/BHugvh/dataset_train_url. Xem [docs/MODEL-V8-DEPLOY-REPORT.md](docs/MODEL-V8-DEPLOY-REPORT.md).
- Biến môi trường backend: `PORT`, `URLHAUS_API_KEY`, `GOOGLE_SAFE_BROWSING_API_KEY`,
  `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_KEY` (đều tuỳ chọn). Chi tiết API: [docs/IMPROVEMENT-REPORT.md](docs/IMPROVEMENT-REPORT.md).
- Backend (Render): `uvicorn backend.src.main:app --host 0.0.0.0 --port $PORT`, `PYTHON_VERSION=3.11.9`.
- Giao diện: host tĩnh thư mục này (GitHub Pages, Netlify, Vercel…). Backend đã bật CORS cho mọi origin.

## Mạng xã hội

Dự án chưa có trang mạng xã hội chính thức nên các biểu tượng ở footer chưa dẫn tới đâu. Khi có, điền địa chỉ
`https://` thật vào `SOCIAL_LINKS` ở đầu [js/common.js](js/common.js).

## Nguồn dữ liệu

PhishVN – Mendeley Data v4 (CC BY 4.0) · PhiUSIIL – UCI #967 (CC BY 4.0).
