# Chính sách quyền riêng tư & Điều khoản sử dụng — ScamShield-AI

- **Ngày cập nhật:** 25/11/2026
- **Phạm vi áp dụng:** trang web https://gaost25uytingiare.vercel.app và API https://scamshield-ai-be.onrender.com
- **Về dự án:** ScamShield-AI là dự án học tập của nhóm sinh viên: công cụ kiểm tra một URL có phải lừa đảo hay không, gồm trang web quét URL, API FastAPI và mô hình AI v8. Tài liệu này được soạn theo tinh thần Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân. Đây là văn bản của dự án học tập, không phải tư vấn pháp lý.

> **Ghi chú cho nhóm (đọc trước khi công bố):** 3 quyết định về thời gian lưu và kênh liên hệ đã được chốt ngày 25/11/2026 (xem cuối tài liệu). Nội dung đã khớp với code đang chạy trên nhánh deploy ngày 24/11/2026.

---

## A. Chính sách quyền riêng tư

### A.1. Dữ liệu chúng tôi thu thập

| Dữ liệu | Dùng để làm gì | Lưu ở đâu | Thời gian lưu |
| --- | --- | --- | --- |
| URL bạn gửi để quét | Kiểm tra URL có lừa đảo không (tra danh sách đen/trắng, URLhaus, Google Safe Browsing, mô hình AI) | Chỉ xử lý trong bộ nhớ khi quét, **không lưu lên máy chủ** | Không lưu |
| Thông tin công khai của tên miền trong URL đó (DNS, WHOIS, TLS, HTTP) | Hiển thị trong kết quả quét | Chỉ dùng để tạo kết quả trả về, không lưu riêng | Không lưu |
| Báo cáo lừa đảo bạn gửi *(tính năng sẽ có khi B-06 hoàn thành)* | Kiểm duyệt rồi bổ sung vào danh sách cảnh báo | Cơ sở dữ liệu Supabase, trạng thái "chờ duyệt" | Tối đa 12 tháng kể từ ngày gửi (báo cáo bị từ chối: tối đa 3 tháng). Báo cáo được duyệt: URL được giữ lại trong danh sách cảnh báo, bản ghi báo cáo gốc vẫn bị xóa sau tối đa 12 tháng. |
| Phản hồi "kết quả này sai" *(tính năng sẽ có khi B-08 hoàn thành)* | Làm dữ liệu huấn luyện lại mô hình | Cơ sở dữ liệu Supabase, lưu **ẩn danh** (chỉ URL và đánh giá đúng/sai) | Cho đến khi được dùng để huấn luyện lại mô hình, tối đa 24 tháng |
| Nhật ký kỹ thuật (mã yêu cầu, đường dẫn API, mã trạng thái, loại lỗi) | Giám sát lỗi và chống lạm dụng | Nhật ký máy chủ (Render) | 30 ngày |
| Dữ liệu trên trình duyệt của bạn (lịch sử báo cáo, ngôn ngữ giao diện) | Hiển thị lại lịch sử cho bạn | Chỉ lưu trên máy của bạn (localStorage), **không gửi lên máy chủ** | Do bạn tự xóa trong trình duyệt |

### A.2. Dữ liệu chúng tôi KHÔNG thu thập

- Không yêu cầu tạo tài khoản, không thu họ tên, email, mật khẩu.
- Không thu số điện thoại, số tài khoản ngân hàng, địa chỉ.
- Không thu vị trí, không dùng cookie theo dõi hay quảng cáo.
- Không đọc nội dung tin nhắn hay email của bạn. Tính năng tra cứu SĐT/STK và cảnh báo tin nhắn đã bị loại khỏi dự án.
- Địa chỉ IP của bạn chỉ được dùng (nếu có) để giới hạn tần suất gọi API chống spam; chúng tôi không dùng IP để định danh hay theo dõi bạn.

### A.3. Dữ liệu được chia sẻ với bên thứ ba nào

Khi bạn quét một URL, hệ thống có thể gửi URL đó cho:

- **Google Safe Browsing** — tra cứu URL có nằm trong danh sách nguy hiểm không.
- **URLhaus (abuse.ch)** — tra cứu URL có nằm trong danh sách mã độc không.
- **Máy chủ DNS / WHOIS / TLS công khai** — lấy thông tin công khai của tên miền.
- **Vercel** (lưu trữ trang web), **Render** (lưu trữ API), **Supabase** (lưu trữ danh sách đen/trắng, báo cáo, phản hồi) — là hạ tầng chạy dịch vụ, không phải bên mua bán dữ liệu.

Khi bạn bấm liên kết ra ngoài (ví dụ trang báo cáo của Cục An toàn thông tin tại canhbao.khonggianmang.gov.vn), chính sách của trang đó sẽ áp dụng, không phải chính sách này.

### A.4. Quyền của bạn và cách yêu cầu xóa dữ liệu

- Bạn có quyền yêu cầu xóa báo cáo hoặc phản hồi mình đã gửi. Hãy liên hệ qua mục Issues của repo GitHub https://github.com/Cuong-VnC/ScamShield-AI/issues, dùng mẫu "Yêu cầu xóa dữ liệu" và chỉ cung cấp URL đã gửi cùng thời gian gửi để nhóm đối chiếu — không ghi thêm thông tin cá nhân. Nhóm sẽ xử lý trong vòng 7 ngày.
- Lịch sử báo cáo trên trình duyệt của bạn: xóa trong phần cài đặt/lịch sử của trình duyệt, nhóm không thể xóa thay bạn vì dữ liệu đó không nằm trên máy chủ.
- Bạn có thể ngừng dùng dịch vụ bất cứ lúc nào; việc quét URL không cần tài khoản nên không có dữ liệu tài khoản nào cần xóa.

### A.5. Thay đổi chính sách

Khi chính sách thay đổi, ngày cập nhật ở đầu trang sẽ được sửa. Thay đổi lớn sẽ được thông báo trên trang web.

---

## B. Điều khoản sử dụng

### B.1. Kết quả quét chỉ mang tính tham khảo

- Kết quả do mô hình AI v8, bộ quy tắc và các dịch vụ tra cứu bên thứ ba đưa ra. Mô hình **có thể sai**: báo nhầm trang an toàn thành lừa đảo (false positive) hoặc bỏ sót trang lừa đảo (false negative). Kiểm thử nội bộ ngày 25/11/2026 đã ghi nhận 5 trường hợp báo nhầm trên 50 URL thử nghiệm.
- **Luôn kiểm chứng độc lập trước khi quyết định**, đặc biệt là trước khi chuyển tiền, nhập mật khẩu hay cung cấp thông tin cá nhân. Hãy đối chiếu với kênh chính thức của ngân hàng, sàn thương mại điện tử hoặc cơ quan chức năng.
- Nhóm phát triển không chịu trách nhiệm cho thiệt hại phát sinh từ việc người dùng dựa hoàn toàn vào kết quả quét.

### B.2. Sử dụng đúng mục đích

- Không gọi API liên tục với tần suất lớn để gây quá tải (spam); hệ thống có giới hạn tần suất và sẽ tạm chặn khi vượt quá.
- Không dùng dịch vụ để thu thập thông tin, quấy rối, lừa đảo hay vi phạm pháp luật.
- Không gửi URL chứa thông tin cá nhân của người khác.
- Không giả mạo trang web hay thương hiệu của người khác.

### B.3. Nội dung báo cáo bạn gửi

- Bạn chịu trách nhiệm về tính chính xác của báo cáo mình gửi.
- Báo cáo sai sự thật hoặc cố tình phá hoại sẽ bị từ chối và xóa.
- Báo cáo được kiểm duyệt và chấp nhận sẽ được đưa vào danh sách cảnh báo để bảo vệ người dùng khác.

### B.4. Về dịch vụ

- Dịch vụ miễn phí, vận hành bởi nhóm sinh viên trong khuôn khổ đồ án. Dịch vụ có thể gián đoạn hoặc chậm (ví dụ máy chủ miễn phí cần thời gian khởi động lại sau khi nghỉ); nhóm không cam kết thời gian hoạt động liên tục.
- Nhóm có thể thay đổi, tạm dừng hoặc ngừng dịch vụ mà không cần báo trước.

### B.5. Liên hệ

- Mọi thắc mắc hoặc yêu cầu liên quan đến chính sách này, gửi qua mục Issues của repo GitHub: https://github.com/Cuong-VnC/ScamShield-AI/issues (nhóm phản hồi trong vòng 7 ngày).

---

## Privacy Policy & Terms of Use (English)

- **Last updated:** 25/11/2026
- **Scope:** https://gaost25uytingiare.vercel.app and https://scamshield-ai-be.onrender.com
- **About the project:** ScamShield-AI is a student project: a tool that checks whether a URL is a scam, consisting of a URL-scanning website, a FastAPI backend and the v8 AI model. This document follows the spirit of Vietnam's Decree 13/2023/ND-CP on personal data protection. It is a student project document, not legal advice.

### A. Privacy Policy

#### A.1. Data we collect

| Data | Purpose | Where it is stored | Retention |
| --- | --- | --- | --- |
| URL you submit for scanning | Checking whether the URL is a scam (blocklist/allowlist lookup, URLhaus, Google Safe Browsing, AI model) | Processed in memory only, **not stored on our servers** | Not stored |
| Public information about the domain in that URL (DNS, WHOIS, TLS, HTTP) | Shown in the scan result | Used only to build the result, not stored separately | Not stored |
| Scam reports you submit *(available once B-06 is complete)* | Reviewed and added to the warning list | Supabase database, status "pending review" | Up to 12 months from submission (rejected reports: up to 3 months). For approved reports, the URL stays in the warning list while the original report record is still deleted after up to 12 months. |
| "This result is wrong" feedback *(available once B-08 is complete)* | Used as training data to retrain the model | Supabase database, stored **anonymously** (URL and correct/wrong verdict only) | Until used to retrain the model, up to 24 months |
| Technical logs (request ID, API route, status code, error type) | Error monitoring and abuse prevention | Server logs (Render) | 30 days |
| Browser data (report history, interface language) | Showing your history back to you | Stored only on your device (localStorage), **never sent to our servers** | You delete it in your browser settings |

#### A.2. Data we do NOT collect

- No accounts required; we do not collect names, emails or passwords.
- No phone numbers, bank account numbers or addresses.
- No location, no tracking or advertising cookies.
- We do not read your messages or emails. Phone/bank-number lookup and message-alert features have been removed from the project.
- Your IP address may be used (if applicable) only to rate-limit API calls against spam; we do not use it to identify or track you.

#### A.3. Third parties we share data with

When you scan a URL, the system may send that URL to:

- **Google Safe Browsing** — to check whether the URL is on a dangerous list.
- **URLhaus (abuse.ch)** — to check whether the URL is on a malware list.
- **Public DNS / WHOIS / TLS servers** — to fetch public information about the domain.
- **Vercel** (website hosting), **Render** (API hosting), **Supabase** (database for the blocklist/allowlist, reports and feedback) — infrastructure providers, not data buyers.

When you follow an external link (for example the report page of the Authority of Information Security at canhbao.khonggianmang.gov.vn), that site's policy applies instead of this one.

#### A.4. Your rights and how to request deletion

- You can request deletion of a report or feedback you submitted. Contact us via the Issues section of the GitHub repo at https://github.com/Cuong-VnC/ScamShield-AI/issues, using the "Data deletion request" template and providing only the submitted URL and the time of submission so we can match it — no additional personal information. We will handle your request within 7 days.
- Report history in your browser: delete it in your browser settings; we cannot delete it for you because it is not on our servers.
- You can stop using the service at any time; scanning requires no account, so there is no account data to delete.

#### A.5. Changes to this policy

When this policy changes, the date at the top will be updated. Major changes will be announced on the website.

### B. Terms of Use

#### B.1. Scan results are for reference only

- Results come from the v8 AI model, a rule-based engine and third-party lookup services. The model **can be wrong**: it may flag a safe site as a scam (false positive) or miss a scam site (false negative). Internal testing on 25/11/2026 recorded 5 false positives out of 50 test URLs.
- **Always verify independently before acting**, especially before sending money, entering a password or sharing personal information. Cross-check with the official channels of your bank, e-commerce platform or the authorities.
- The development team is not liable for losses resulting from relying solely on scan results.

#### B.2. Acceptable use

- Do not call the API at high frequency to overload it (spam); the system rate-limits and temporarily blocks excessive use.
- Do not use the service to collect information, harass, scam or break the law.
- Do not submit URLs containing other people's personal information.
- Do not impersonate websites or brands.

#### B.3. Content of reports you submit

- You are responsible for the accuracy of reports you submit.
- False or maliciously disruptive reports will be rejected and deleted.
- Approved reports will be added to the warning list to protect other users.

#### B.4. About the service

- The service is free and run by a student team as a coursework project. It may be interrupted or slow (for example, the free-tier server needs time to wake up after idle periods); we do not guarantee continuous uptime.
- We may change, suspend or discontinue the service without prior notice.

#### B.5. Contact

- Questions or requests about this policy: open an issue at https://github.com/Cuong-VnC/ScamShield-AI/issues (we reply within 7 days).

---

## Ghi chú cho nhóm review (xóa trước khi đăng lên web ở F-05)

- 3 quyết định đã chốt ngày 25/11/2026: (1) báo cáo lưu tối đa 12 tháng (bị từ chối: tối đa 3 tháng), (2) phản hồi lưu cho đến khi dùng để huấn luyện lại mô hình, tối đa 24 tháng, (3) kênh liên hệ chính thức là GitHub Issues, có mẫu "Yêu cầu xóa dữ liệu" và thời gian xử lý trong vòng 7 ngày.
- Mốc "tính năng sẽ có khi B-06/B-08 hoàn thành" phải được cập nhật khi Tùng (B-06) và Quân (B-08) làm xong: khi đó báo cáo và phản hồi mới thực sự được lưu lên server; hiện tại trang báo cáo chỉ lưu trên trình duyệt.
- Câu về "5 trường hợp báo nhầm trên 50 URL" lấy từ kết quả hồi quy Q-01 ngày 25/11/2026 (ket-qua-q01.json); cập nhật lại nếu model được train lại (M-06) hoặc ngưỡng thay đổi (M-03).
- Tài liệu này đã đối chiếu với code thật trên nhánh deploy (24/11/2026): `/predict` không lưu URL đã quét lên server, log chỉ ghi mã yêu cầu/đường dẫn/mã trạng thái (không ghi URL), không có tài khoản người dùng, báo cáo hiện chỉ lưu localStorage.
