# API ScamShield-AI

Base URL của backend Render là `https://scamshield-ai-be.onrender.com`.
Có thể gửi thử request tại [FastAPI Swagger UI](https://scamshield-ai-be.onrender.com/docs).

Tài liệu mô tả backend tại commit [dcba267](https://github.com/Cuong-VnC/ScamShield-AI/tree/dcba2679ae1beb486620fc39cf509eb339727daf/backend/src)
trên nhánh `Nhánh-của-đại-ca`. Các giá trị trong ví dụ response dùng để minh họa.

## POST /predict

Quét một URL và trả về kết quả phân loại. Gửi `Content-Type: application/json`
với trường `url` bắt buộc, kiểu chuỗi, tối đa 2048 ký tự sau khi bỏ khoảng trắng
ở hai đầu. API chấp nhận HTTP và HTTPS, mặc định thêm `http://` nếu thiếu scheme.

```bash
curl -X POST 'https://scamshield-ai-be.onrender.com/predict' \
  -H 'Content-Type: application/json' \
  --data '{"url":"https://example.com"}'
```

Ví dụ HTTP 200, rút gọn nội dung `domain_info` (xem cấu trúc ở mục tiếp theo).

```json
{
  "url": "https://example.com",
  "status": "Safe",
  "probability": 0.0321,
  "risk_level": "Low",
  "technical_report": {
    "domain_age": "N/A",
    "dns_status": "Active",
    "impersonation_risk": "Low",
    "is_shortened": false,
    "nn_probability": 0.04
  },
  "source": "ai_analysis",
  "domain_info": {"status": "active", "reachable": true},
  "domain_status": "active",
  "warning": null
}
```

- `status` có thể là `Safe`, `Phishing`, `Phishing/Malicious` hoặc
  `DomainNotFound`. Trường hợp `DomainNotFound` vẫn trả HTTP 200 với
  `probability: null`, `risk_level: "Unknown"` và `message` giải thích.
- `probability` là điểm trong khoảng 0–1. Với `source: "ai_analysis"`,
  `status` dựa vào ngưỡng model trong `/health`. `risk_level` dùng các ngưỡng
  riêng: `High` từ 0,7, `Medium` từ 0,4 đến dưới 0,7 và `Low` dưới 0,4.
- `source` cho biết kết quả đến từ model, whitelist, dữ liệu nội bộ, URLhaus,
  Google Safe Browsing hoặc kiểm tra tên miền. `technical_report` thay đổi
  theo nguồn. Phản hồi từ URLhaus và Google Safe Browsing có thể thiếu `url`.
- `domain_status` phản ánh tình trạng hoạt động của tên miền. `warning` là
  chuỗi cảnh báo khi có hoặc `null`.

## GET /domain-info

Kiểm tra tên miền qua DNS, WHOIS, TLS và HTTP. Truyền `url` qua query string,
tối đa 2048 ký tự sau khi bỏ khoảng trắng ở hai đầu. Hãy URL-encode tham số
nếu URL đích chứa query string hoặc ký tự đặc biệt.

```bash
curl --get 'https://scamshield-ai-be.onrender.com/domain-info' \
  --data-urlencode 'url=https://example.com'
```

Ví dụ HTTP 200, rút gọn các nhóm thông tin kiểm tra.

```json
{
  "url": "https://example.com",
  "domain_info": {
    "domain": "example.com",
    "host": "example.com",
    "is_ip_host": false,
    "dns": {"status": "resolved"},
    "whois": {"age_days": null},
    "tls": {"error": null},
    "http": {"status_code": 200, "reachable": true},
    "status": "active",
    "reachable": true
  }
}
```

`status` có thể là `active`, `inactive`, `nonexistent` hoặc `unknown`.
`reachable` là `true`, `false` hoặc `null` khi chưa xác định được. Các
phép kiểm tra có thể trả dữ liệu một phần nếu nhà cung cấp không có dữ liệu
hoặc phép kiểm tra hết thời gian.

## GET /health

Kiểm tra tiến trình API và trạng thái sẵn sàng của model. Endpoint không
cần tham số hay body.

```bash
curl 'https://scamshield-ai-be.onrender.com/health'
```

```json
{"status":"ok","models_loaded":true,"threshold":0.45}
```

Endpoint vẫn trả HTTP 200 với `status: "degraded"` và
`models_loaded: false` nếu model chưa tải được. Dùng `models_loaded` để
kiểm tra API đã sẵn sàng chạy suy luận.

## GET /stats

Lấy số liệu tổng hợp của danh sách URL phishing và hợp lệ. Endpoint không
cần tham số hay body.

```bash
curl 'https://scamshield-ai-be.onrender.com/stats'
```

```json
{
  "phishing_urls": 20,
  "legitimate_urls": 80,
  "total_urls": 100,
  "malicious_ratio_percent": 20.0,
  "status": "available"
}
```

HTTP 200 có thể trả `status: "available"`, `"partial"` hoặc
`"unavailable"`. Các trường số liệu chưa xác định có giá trị `null`.
Tỷ lệ tính theo thang 0–100 và là `null` khi tổng bằng 0.

## Lỗi và thử lại

Ví dụ HTTP 429 do giới hạn tần suất.

```json
{
  "detail": "Too many requests",
  "error_code": "RATE_LIMITED",
  "request_id": "7f623287ed934fb1b483dee292f24764"
}
```

| HTTP | `error_code` | Khi nào xảy ra |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Query `url` thiếu, rỗng hoặc quá dài ở `/domain-info`. |
| 400 | `INVALID_URL` | URL sai định dạng hoặc dùng scheme ngoài HTTP và HTTPS. |
| 400 | `URL_BLOCKED` | Đích bị chính sách an toàn mạng chặn. |
| 408 | `REQUEST_TIMEOUT` | Gửi body `/predict` quá thời gian cho phép. |
| 413 | `INVALID_REQUEST` | Body `/predict` vượt 16 KiB. |
| 422 | `INVALID_REQUEST` | JSON hoặc dữ liệu `/predict` không hợp lệ. `detail` là mảng lỗi kiểm tra dữ liệu. |
| 429 | `RATE_LIMITED` | Gọi `/predict` hoặc `/domain-info` quá thường xuyên. |
| 503 | `SERVER_BUSY` | Hết suất xử lý đồng thời cho `/predict` hoặc `/domain-info`. |
| 503 | `MODEL_NOT_READY` | `/predict` cần chạy model nhưng model chưa sẵn sàng. |
| 500 | `INTERNAL_ERROR` | Backend gặp lỗi khi xử lý. |

Với `RATE_LIMITED` và `SERVER_BUSY`, đợi theo header `Retry-After`
(backend hiện trả 2 giây) trước khi thử lại. Khi báo lỗi, gửi `request_id`
hoặc giá trị header `X-Request-ID` để nhóm tra log.
