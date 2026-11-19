/* ============================================================================
   SONG NGỮ VI / EN cho ScamShield-AI (bản redesign)
   ----------------------------------------------------------------------------
   Dựa trên language.js của ScamShield-AI-fixed_fe, mở rộng cho bản có model AI:
     - DICTIONARY: toàn bộ chuỗi giao diện tĩnh + động của hai trang.
     - reason():   dịch lý do của bộ quy tắc (js/url-analyzer.js) theo id cố định.
     - aiWarning(), aiError(), domainNotFound(): dịch cảnh báo / lỗi do backend trả về.
   Nguyên tắc:
     - Chỉ dùng bản dịch tĩnh, không dịch máy lúc chạy.
     - Không đụng tới điểm số, xác suất, status code, tên miền, URL, mã lỗi kỹ thuật.
     - Chỉ lưu mã ngôn ngữ (key "scamshield_language"), không lưu dữ liệu người dùng.
   ============================================================================ */

const Language = (() => {
  const KEY = "scamshield_language";
  const LOCALES = { vi: "vi-VN", en: "en-US" };

  const DICTIONARY = {
    vi: {
      // ---------- Chung ----------
      skipLink: "Bỏ qua, tới nội dung chính",
      brandHome: "ScamShield-AI – về trang chủ",
      navReport: "Báo cáo lừa đảo",
      langGroup: "Chọn ngôn ngữ",
      langToggle: "Đổi ngôn ngữ – đang dùng: {name}",
      aiChecking: "Đang kết nối",
      aiOnline: "Đang hoạt động",
      aiOffline: "Ngoại tuyến",
      aiDegraded: "Chưa sẵn sàng",
      aiTipChecking: "Đang kiểm tra máy chủ model AI ({api})",
      aiTipOnline: "Máy chủ model AI đã nạp xong model ({api})",
      aiTipOffline: "Chưa kết nối được dịch vụ phân tích ({api}). Trang sẽ tự thử lại.",
      aiTipDegraded: "Máy chủ ({api}) có phản hồi nhưng model chưa được nạp.",
      toTop: "Lên đầu trang",

      // ---------- Trang chủ ----------
      pageTitleHome: "ScamShield-AI – Kiểm tra đường link trước khi truy cập",
      metaHome: "Dán đường link đáng ngờ để ScamShield-AI đánh giá rủi ro bằng mô hình AI và phân tích địa chỉ web, kèm giải thích các dấu hiệu cần chú ý.",
      heroTitle: 'Kiểm tra đường link <span class="hl">trước khi truy cập</span>',
      heroLead: "Dán đường link bạn nghi ngờ. ScamShield-AI kết hợp mô hình AI với phân tích địa chỉ web để đánh giá rủi ro và giải thích những dấu hiệu cần chú ý.",
      inputLabel: "Đường link cần kiểm tra",
      inputPlaceholder: "Dán đường link, ví dụ: https://example.com/path",
      scanBtn: "Quét URL",
      scanBusy: "Đang quét…",
      emptyInput: "Vui lòng dán một đường link để quét.",
      tick1: "Phân tích URL bằng AI",
      tick2: "Giải thích dấu hiệu rủi ro",
      tick3: "Không cần tạo tài khoản",
      statsLabel: "Thống kê danh sách URL của ScamShield-AI",
      statStoredPhishing: "URL độc hại trong dữ liệu",
      statStoredLegitimate: "URL hợp lệ trong dữ liệu",
      statStoredTotal: "Tổng URL lưu trữ",
      statMaliciousRatio: "Tỷ lệ URL độc hại",
      statsRatioNote: "Tỷ lệ tính trên tổng số URL lưu trữ.",
      statsLoading: "Đang lấy số liệu thống kê…",
      statsPartial: "Một số chỉ số chưa có dữ liệu.",
      statsUnavailable: "Chưa lấy được số liệu thống kê.",

      // Thông báo cho trình đọc màn hình
      announcePending: "Đang chờ kết quả từ máy chủ.",
      announceDone: "Kết quả kiểm tra: {verdict}",
      announceCleared: "Đã xoá lịch sử kiểm tra.",

      // ---------- Lịch sử ----------
      historyTitle: "Kiểm tra gần đây",
      historyNote: "Chỉ lưu trên trình duyệt này",
      historyClear: "Xoá lịch sử",
      historyRescan: "Quét lại",
      historyRescanAria: "Quét lại {url}",

      // ---------- Ba khu vực giữa trang ----------
      howTitle: "ScamShield hoạt động như thế nào?",
      howLead: "Ba bước ngắn từ lúc dán đường link đến khi nhận kết quả.",
      how1Title: "Nhập đường link",
      how1Desc: "Dán đường link đáng ngờ bạn nhận được vào ô quét ở đầu trang.",
      how2Title: "Phân tích rủi ro",
      how2Desc: "Máy chủ tra cứu dữ liệu và dùng mô hình AI khi cần. Trình duyệt phân tích thêm các dấu hiệu trong URL.",
      how3Title: "Nhận kết quả",
      how3Desc: "Xem kết luận và nguồn từ máy chủ, cùng các dấu hiệu URL để tham khảo.",

      examTitle: "ScamShield kiểm tra những yếu tố nào?",
      examLead: "Kết quả đến từ máy chủ. Các dấu hiệu trên trình duyệt cung cấp thêm thông tin về URL.",
      exam1Title: "Cấu trúc URL",
      exam1Desc: "Tên miền, tên miền phụ, đường dẫn và những dấu hiệu bất thường như địa chỉ IP, link rút gọn hay đuôi tên miền hay bị lạm dụng.",
      exam2Title: "Dấu hiệu giả mạo",
      exam2Desc: "Từ khoá đáng ngờ và tên miền bắt chước thương hiệu quen thuộc, kể cả kiểu gõ sai cố ý hoặc dùng ký tự trông giống nhau.",
      exam3Title: "Mô hình AI",
      exam3Desc: "Model đã huấn luyện phân tích các đặc trưng của đường link và đưa ra xác suất lừa đảo.",
      exam4Title: "Thông tin tên miền",
      exam4Desc: "Thông tin DNS, chứng chỉ TLS, phản hồi HTTP và WHOIS khi máy chủ tra cứu được.",

      whenTitle: "Khi nào bạn nên kiểm tra đường link?",
      whenLead: "Gặp một trong những tình huống dưới đây, hãy dừng lại vài giây và quét trước khi bấm.",
      when1Title: "Link nhận qua SMS hoặc ứng dụng nhắn tin",
      when1Desc: "Tin nhắn báo giao hàng, khoá tài khoản hay hoàn tiền kèm một đường link lạ, kể cả khi người gửi hiển thị tên thương hiệu.",
      when2Title: "Trang yêu cầu đăng nhập hoặc nhập OTP",
      when2Desc: "Trước khi nhập mật khẩu, mã OTP hay thông tin thẻ, hãy chắc chắn bạn đang ở đúng trang chính thức.",
      when3Title: "Ưu đãi, trúng thưởng bất thường",
      when3Desc: "Quà tặng, giảm giá quá sâu hay thông báo trúng thưởng cho chương trình bạn chưa từng tham gia thường là mồi nhử.",
      when4Title: "Địa chỉ na ná tổ chức quen thuộc",
      when4Desc: "Tên miền giống ngân hàng, cơ quan nhà nước hay sàn thương mại điện tử nhưng thêm ký tự, dấu gạch ngang hoặc đuôi lạ.",
      whenCta: "Quét một đường link ngay",

      // ---------- Kết quả quét ----------
      kickerPending: "Đang chờ máy chủ",
      kickerFail: "Kết quả chưa có",
      kickerOk: "Kết quả từ máy chủ",
      kickerPlain: "Kết quả kiểm tra",
      titleDanger: "Máy chủ phân loại: Phishing",
      titleSafe: "Máy chủ phân loại: An toàn",
      titleNotFound: "Tên miền không tồn tại",
      titleInvalid: "Đường link không hợp lệ",
      invalidReason: "Nhập URL HTTP hoặc HTTPS hợp lệ, ví dụ: https://example.com/path.",
      levelDanger: "Phishing",
      levelSafe: "An toàn",
      partSub: "tên miền phụ",
      partDom: "tên miền chính",
      partSuf: "đuôi",
      partPath: "đường dẫn",
      partIp: "địa chỉ IP",
      titlePending: "Đang phân tích — chưa có kết luận.",
      titleUnavailable: "Chưa thể xác định — dịch vụ phân tích hiện không khả dụng.",
      titleUnknown: "Chưa thể xác định",
      levelUnknown: "Chưa xác định",
      historyUnverified: "Chưa có nguồn kết luận",
      partHost: "tên máy chủ",
      partScheme: "giao thức",
      scoreBackend: "Điểm từ máy chủ",
      urlSignals: "Dấu hiệu phân tích URL",
      signalsReference: "Các dấu hiệu do quy tắc trên trình duyệt phát hiện chỉ dùng để tham khảo.",
      signalsCaution: "Quy tắc trên trình duyệt nhận thấy dấu hiệu URL đáng chú ý. Hãy kiểm tra kỹ trước khi nhập thông tin.",
      localReportReference: "URL này có trong báo cáo cá nhân lưu trên trình duyệt. Báo cáo chỉ dùng để tham khảo.",
      credentialsBlocked: "URL chứa thông tin đăng nhập. Hãy xóa thông tin này trước khi gửi URL để phân tích.",
      errUrlCredentials: "Hãy xóa thông tin đăng nhập khỏi URL trước khi lưu báo cáo.",
      savedReportsTitle: "Báo cáo đã lưu",
      savedReportsEmpty: "Chưa có báo cáo trên trình duyệt này.",
      signal_brand_reference: "Tên miền khớp mục tham chiếu cho {brand}.",
      signal_host_is_ip: "URL dùng địa chỉ IP thay cho tên miền.",
      signal_no_https: "URL dùng HTTP, không mã hóa kết nối như HTTPS.",
      signal_at_symbol: "URL có thông tin đăng nhập trước tên máy chủ.",
      signal_tld_risk: "Đuôi .{tld} nằm trong danh sách tham chiếu để kiểm tra thêm.",
      signal_shortener: "Dịch vụ rút gọn che địa chỉ đích trong URL này.",
      signal_user_content: "Nền tảng {platform} cho phép người dùng tạo trang.",
      signal_deep_subdomain: "Có {count} cấp tên miền phụ.",
      signal_domain_in_subdomain: "Tên miền phụ “{sub}” trông giống một tên miền riêng.",
      signal_many_hyphens: "Tên miền chứa {count} dấu gạch ngang.",
      signal_digit_ratio: "Tên miền chứa nhiều chữ số.",
      signal_long_host: "Tên máy chủ dài {count} ký tự.",
      signal_random_host: "Một phần tên miền trông giống chuỗi ký tự ngẫu nhiên.",
      signal_odd_port: "URL dùng cổng {port}.",
      signal_long_url: "URL dài {count} ký tự.",
      signal_embedded_url: "Đường dẫn hoặc truy vấn chứa một URL khác.",
      signal_brand_in_path: "Đường dẫn có nhắc đến {brand}. Tên miền tham chiếu: {referenceDomain}.",
      signal_brand_outside_regdomain: "Tên {brand} xuất hiện trong {where} của {domain}. Tên miền tham chiếu: {referenceDomain}.",
      signal_homoglyph: "“{observed}” dùng ký tự trông giống “{term}” ({brand}).",
      signal_typosquat: "“{observed}” có cách viết gần giống “{term}” ({brand}).",
      signal_punycode: "Tên miền có ký tự quốc tế: “{unicode}”.",
      signalKeyword: "Từ khóa “{keyword}” xuất hiện trong {where}.",
      signalOther: "Có dấu hiệu trong cấu trúc URL.",
      probAi: "Xác suất lừa đảo (model AI)",
      scoreRules: "Điểm tín hiệu rủi ro: {score}",
      noSignals: "Chưa phát hiện dấu hiệu đáng chú ý trong cấu trúc URL.",
      aiPending: "Đang chờ kết quả phân tích từ máy chủ.",
      aiPendingHint: "Nếu máy chủ vừa khởi động lại, lần đầu có thể mất tới khoảng một phút.",
      aiFail: "Chi tiết: {error}.",
      aiRetry: "Thử phân tích lại",
      chipSource: "Nguồn: {src}",
      chipRisk: "Mức rủi ro: {risk}",
      chipNn: "NN: {p}%",
      chipNnTip: "Xác suất của riêng mạng nơ-ron trước khi xếp chồng XGBoost",
      reportPrompt: "Bạn nghi ngờ đường link này?",
      reportLink: "Lưu báo cáo",
      domainNotFoundMsg: "Tên miền {domain} không tồn tại (DNS không phân giải được) — không thể truy cập.",
      domainNotFoundFallback: "Tên miền này không phân giải được trên Internet – có thể đã bị xoá hoặc chưa từng được đăng ký.",

      // Nguồn kết quả của backend
      src_whitelist: "Danh sách tin cậy của máy chủ",
      src_ai_analysis: "AI v8 (CNN+BiLSTM → XGBoost)",
      src_database_blacklist: "Danh sách chặn Supabase",
      src_database_whitelist: "Danh sách cho phép Supabase",
      src_urlhaus_database: "URLhaus",
      src_google_safe_browsing: "Google Safe Browsing",
      src_domain_check: "Kiểm tra tên miền",
      src_unknown: "Không rõ",
      risk_High: "Cao",
      risk_Medium: "Trung bình",
      risk_Low: "Thấp",
      risk_Unknown: "Không rõ",

      // Lỗi khi gọi backend
      errTimeout: "máy chủ phản hồi quá chậm, có thể đang khởi động lại",
      errNetwork: "không kết nối được dịch vụ phân tích",
      errHttp: "máy chủ trả về lỗi HTTP {status}",
      errInvalid: "dữ liệu trả về không hợp lệ",
      errFormat: "URL không đúng định dạng: {reason}",
      errBlocked: "máy chủ chặn URL này vì lý do bảo mật",
      errModels: "máy chủ chưa nạp xong model",
      errServer: "máy chủ gặp lỗi nội bộ",
      errRate: "quá nhiều yêu cầu, vui lòng thử lại sau",
      errBusy: "máy chủ đang bận, vui lòng thử lại sau",
      errRequest: "yêu cầu không hợp lệ hoặc quá dài",
      errUnknown: "lỗi không xác định",

      // ---------- Thông tin tên miền ----------
      diSummary: "Thông tin tên miền chi tiết",
      diOverview: "Tổng quan",
      diTls: "Chứng chỉ TLS",
      diDomain: "Tên miền",
      diHost: "Máy chủ (host)",
      diStatus: "Trạng thái",
      diCreated: "Ngày đăng ký",
      diExpires: "Ngày hết hạn",
      diUpdated: "Cập nhật",
      diRegistrar: "Nhà đăng ký",
      diAge: "Tuổi tên miền",
      diNs: "Name server",
      diValid: "Hợp lệ",
      diIssuer: "Tổ chức cấp",
      diTlsExpires: "Hết hạn",
      diValidity: "Thời hạn",
      diVersion: "Phiên bản",
      diReachable: "Truy cập được",
      diStatusCode: "Mã trạng thái",
      diFinalUrl: "URL cuối cùng",
      diRedirects: "Chuyển hướng",
      diServer: "Máy chủ web",
      diResponse: "Thời gian phản hồi",
      diIp: "Địa chỉ IP",
      diGeo: "Vị trí / nhà mạng",
      diNotFound: "Không tìm thấy",
      diActive: "Đang hoạt động",
      diInactive: "Không hoạt động",
      diNonexistent: "Không tồn tại",
      diYes: "Có",
      diNo: "Không",
      diValidYes: "Hợp lệ",
      diValidNo: "Không hợp lệ",
      diDays: "{n} ngày",
      diDaysLeft: "Còn {n} ngày",
      diExpiredAgo: "Hết hạn {n} ngày trước",
      diUnreachable: "Không ({error})",
      diConnError: "lỗi kết nối",
      diTlsError: "không thiết lập được TLS",
      diRedirectLimit: "quá nhiều lần chuyển hướng",
      diNoRedirect: "Không có",
      diMs: "{n} ms",

      // ---------- Trang báo cáo ----------
      pageTitleReport: "Báo cáo đường link đáng ngờ – ScamShield-AI",
      metaReport: "Lưu và xem lại báo cáo cá nhân trên trình duyệt này.",
      reportTitle: "Báo cáo đường link đáng ngờ",
      reportLead: "Lưu đường link đáng ngờ và ghi chú của bạn ngay trên trình duyệt này.",
      rfHeading: "Thông tin đường link",
      rfIntro: "Các mục có dấu * là bắt buộc.",
      rfUrl: "URL cần báo cáo",
      rfUrlPh: "Ví dụ: https://example.com/path",
      rfUrlHint: "Dán nguyên đường link, gồm cả đường dẫn nếu có.",
      rfCategory: "Hình thức lừa đảo",
      rfDesc: "Mô tả sự việc",
      rfDescPh: "Bạn nhận được đường link ở đâu, trang web yêu cầu bạn làm gì…",
      rfCommit: "Tôi cam kết thông tin cung cấp là trung thực.",
      rfSubmit: "Lưu báo cáo",
      errUrlEmpty: "Vui lòng nhập đường link cần báo cáo.",
      errUrlInvalid: "Đường link chưa đúng định dạng, ví dụ: tenmien.vn/duong-dan.",
      errDescEmpty: "Vui lòng mô tả ngắn gọn sự việc.",
      errCommit: "Vui lòng đánh dấu ô cam kết trước khi gửi.",
      rfSuccessTitle: "Đã lưu báo cáo trên trình duyệt này",
      rfSuccessBody: "Bạn có thể xem lại báo cáo trên trình duyệt này. Khi quét lại cùng URL, báo cáo xuất hiện dưới dạng thông tin tham khảo.",
      rfSuccessScan: "Quét lại đường link vừa báo cáo",
      rfSaveFail: "Không lưu được báo cáo – trình duyệt đang chặn bộ nhớ cục bộ (localStorage).",
      asideTitle: "Báo cáo của bạn được xử lý thế nào?",
      aside1Title: "Lưu ngay trên trình duyệt",
      aside1Desc: "Báo cáo được lưu cục bộ trên thiết bị này và không gửi lên máy chủ nào.",
      aside2Title: "Tham khảo khi quét lại",
      aside2Desc: "Khi quét lại cùng URL, bạn có thể xem ghi chú rằng URL này đã được báo cáo trên trình duyệt.",
      aside3Title: "Báo cáo tới cơ quan chức năng",
      aside3Desc: "Để báo cáo chính thức tại Việt Nam, bạn có thể gửi thêm qua cổng cảnh báo của cơ quan chức năng:",
      asideScan: "Chưa chắc chắn? Quét đường link trước",

      // Hình thức lừa đảo (giá trị lưu là tên tiếng Việt, giữ tương thích dữ liệu cũ)
      cat_phishing: "Website giả mạo / đánh cắp đăng nhập",
      cat_other: "Khác",

      // ---------- Footer ----------
      footerDesc: "Công cụ kiểm tra đường link đáng ngờ: kết hợp model AI với phân tích địa chỉ web và giải thích vì sao.",
      footerSocial: "Mạng xã hội của ScamShield-AI",
      socialSoon: "{name} – chưa có trang chính thức",
      footerTools: "Công cụ",
      footerScan: "Quét URL",
      footerReport: "Báo cáo lừa đảo",
      footerInfo: "Thông tin",
      footerHow: "ScamShield hoạt động thế nào",
      footerExam: "Các yếu tố được phân tích",
      footerWhen: "Khi nào nên quét URL",
      footerNotes: "Lưu ý",
      footerNote1: "Kết quả chỉ mang tính tham khảo, không thay thế việc xác minh với tổ chức chính thức.",
      footerNote2: "Với trang đáng ngờ: không nhập mật khẩu, mã OTP hay thông tin thẻ và không tải tệp lạ.",
      footerNote3: "Đường link bạn quét được gửi tới máy chủ model AI để phân tích; lịch sử quét và báo cáo chỉ lưu trên trình duyệt của bạn.",
      footerProject: "Dự án nhóm",
      footerDisclaimer: "Kết quả kiểm tra chỉ mang tính tham khảo – luôn cẩn trọng trước khi nhập thông tin hay chuyển tiền.",
      footerData: "Dữ liệu huấn luyện: PhishVN, PhiUSIIL (CC BY 4.0).",
    },

    en: {
      // ---------- Common ----------
      skipLink: "Skip to main content",
      brandHome: "ScamShield-AI – home",
      navReport: "Report a scam",
      langGroup: "Choose language",
      langToggle: "Change language – current: {name}",
      aiChecking: "Connecting",
      aiOnline: "Online",
      aiOffline: "Offline",
      aiDegraded: "Not ready",
      aiTipChecking: "Checking the AI model server ({api})",
      aiTipOnline: "The AI model server has loaded its models ({api})",
      aiTipOffline: "Cannot connect to the analysis service ({api}). The page will retry automatically.",
      aiTipDegraded: "The server ({api}) responds, but its models are not loaded yet.",
      toTop: "Back to top",

      // ---------- Home ----------
      pageTitleHome: "ScamShield-AI – Check a link before you visit",
      metaHome: "Paste a suspicious link and ScamShield-AI assesses its risk with an AI model and web address analysis, explaining the signs worth noticing.",
      heroTitle: 'Check a link <span class="hl">before you visit</span>',
      heroLead: "Paste a link you're unsure about. ScamShield-AI combines an AI model with web address analysis to assess the risk and explain the warning signs worth noticing.",
      inputLabel: "Link to check",
      inputPlaceholder: "Paste a link, e.g. https://example.com/path",
      scanBtn: "Scan URL",
      scanBusy: "Scanning…",
      emptyInput: "Please paste a link to scan.",
      tick1: "AI-powered URL analysis",
      tick2: "Explains the risk signals",
      tick3: "No account needed",
      statsLabel: "ScamShield-AI URL list statistics",
      statStoredPhishing: "Malicious URLs in the dataset",
      statStoredLegitimate: "Legitimate URLs in the dataset",
      statStoredTotal: "Total stored URLs",
      statMaliciousRatio: "Share of malicious URLs",
      statsRatioNote: "Share of malicious URLs in the stored dataset.",
      statsLoading: "Loading statistics…",
      statsPartial: "Some metrics are unavailable.",
      statsUnavailable: "Statistics are currently unavailable.",

      announcePending: "Waiting for the server’s result.",
      announceDone: "Scan result: {verdict}",
      announceCleared: "Scan history cleared.",

      // ---------- History ----------
      historyTitle: "Recent scans",
      historyNote: "Stored only in this browser",
      historyClear: "Clear history",
      historyRescan: "Scan again",
      historyRescanAria: "Scan {url} again",

      // ---------- Middle sections ----------
      howTitle: "How ScamShield works",
      howLead: "Three short steps from pasting a link to getting a result.",
      how1Title: "Paste the link",
      how1Desc: "Paste the suspicious link you received into the scan box at the top of the page.",
      how2Title: "Risk analysis",
      how2Desc: "The server checks its data and uses the AI model when needed. The browser highlights additional URL signals.",
      how3Title: "Get the result",
      how3Desc: "See the server’s verdict and its source, along with URL signals for reference.",

      examTitle: "What ScamShield examines",
      examLead: "The server provides the verdict. In-browser signals offer additional context about the URL.",
      exam1Title: "URL structure",
      exam1Desc: "Domain, subdomains, path and unusual signs such as raw IP addresses, shortened links or frequently abused domain endings.",
      exam2Title: "Impersonation signs",
      exam2Desc: "Suspicious keywords and domains imitating well-known brands, including deliberate typos and lookalike characters.",
      exam3Title: "AI model",
      exam3Desc: "A trained model analyses the link's features and returns a phishing probability.",
      exam4Title: "Domain information",
      exam4Desc: "DNS records, TLS certificate, HTTP response and WHOIS details whenever the server can retrieve them.",

      whenTitle: "When should you scan a URL?",
      whenLead: "If you run into any of these situations, pause for a few seconds and scan before you click.",
      when1Title: "Links received by SMS or messaging apps",
      when1Desc: "Messages about deliveries, locked accounts or refunds with an unfamiliar link, even when the sender shows a brand name.",
      when2Title: "Pages asking you to log in or enter an OTP",
      when2Desc: "Before typing a password, OTP or card details, make sure you are on the genuine official site.",
      when3Title: "Unusual offers or prizes",
      when3Desc: "Gifts, unrealistic discounts or prize notices for draws you never entered are common bait.",
      when4Title: "Addresses that mimic familiar organisations",
      when4Desc: "Domains resembling a bank, a government agency or an online marketplace but with extra characters, hyphens or odd endings.",
      whenCta: "Scan a link now",

      // ---------- Scan result ----------
      kickerPending: "Waiting for the server",
      kickerFail: "Result unavailable",
      kickerOk: "Server result",
      kickerPlain: "Scan result",
      titleDanger: "Server verdict: Phishing",
      titleSafe: "Server verdict: Safe",
      titleNotFound: "Domain not found",
      titleInvalid: "Invalid link",
      invalidReason: "Enter a valid HTTP or HTTPS URL, e.g. https://example.com/path.",
      levelDanger: "Phishing",
      levelSafe: "Safe",
      partSub: "subdomain",
      partDom: "main domain",
      partSuf: "suffix",
      partPath: "path",
      partIp: "IP address",
      titlePending: "Analysis in progress — verdict pending.",
      titleUnavailable: "Unable to determine — the analysis service is currently unavailable.",
      titleUnknown: "Unable to determine",
      levelUnknown: "Undetermined",
      historyUnverified: "Verdict source unavailable",
      partHost: "hostname",
      partScheme: "scheme",
      scoreBackend: "Server score",
      urlSignals: "URL analysis signals",
      signalsReference: "These in-browser rule signals are for reference only.",
      signalsCaution: "In-browser rules found notable URL signals. Check the link carefully before entering information.",
      localReportReference: "This URL was reported in this browser. The personal report is provided for reference.",
      credentialsBlocked: "This URL contains credentials. Remove them before submitting the URL for analysis.",
      errUrlCredentials: "Remove credentials from the URL before saving the report.",
      savedReportsTitle: "Saved reports",
      savedReportsEmpty: "There are no reports in this browser yet.",
      signal_brand_reference: "The domain matches a reference entry for {brand}.",
      signal_host_is_ip: "The URL uses an IP address in place of a domain name.",
      signal_no_https: "The URL uses HTTP, which does not encrypt the connection.",
      signal_at_symbol: "The URL contains credentials before the hostname.",
      signal_tld_risk: "The .{tld} ending is on the reference list for additional checks.",
      signal_shortener: "This shortening service obscures the destination in the URL.",
      signal_user_content: "The platform {platform} lets users create their own pages.",
      signal_deep_subdomain: "There are {count} levels of subdomains.",
      signal_domain_in_subdomain: "The subdomain “{sub}” resembles a separate domain.",
      signal_many_hyphens: "The domain contains {count} hyphens.",
      signal_digit_ratio: "The domain contains many digits.",
      signal_long_host: "The hostname is {count} characters long.",
      signal_random_host: "Part of the domain resembles a random string.",
      signal_odd_port: "The URL uses port {port}.",
      signal_long_url: "The URL is {count} characters long.",
      signal_embedded_url: "The path or query contains another URL.",
      signal_brand_in_path: "The path mentions {brand}. Reference domain: {referenceDomain}.",
      signal_brand_outside_regdomain: "The name {brand} appears in the {where} of {domain}. Reference domain: {referenceDomain}.",
      signal_homoglyph: "“{observed}” uses characters that resemble “{term}” ({brand}).",
      signal_typosquat: "“{observed}” is spelled similarly to “{term}” ({brand}).",
      signal_punycode: "The domain has international characters: “{unicode}”.",
      signalKeyword: "The keyword “{keyword}” appears in the {where}.",
      signalOther: "A URL structure signal was found.",
      probAi: "Phishing probability (AI model)",
      scoreRules: "Risk signal score: {score}",
      noSignals: "No notable URL structure signals were found.",
      aiPending: "Waiting for the server to finish the analysis.",
      aiPendingHint: "If the server has just restarted, the first scan can take up to about a minute.",
      aiFail: "Details: {error}.",
      aiRetry: "Retry analysis",
      chipSource: "Source: {src}",
      chipRisk: "Risk level: {risk}",
      chipNn: "NN: {p}%",
      chipNnTip: "Probability from the neural network alone, before XGBoost stacking",
      reportPrompt: "Suspicious of this link?",
      reportLink: "Save a report",
      domainNotFoundMsg: "The domain {domain} does not exist (DNS could not resolve it) — it cannot be reached.",
      domainNotFoundFallback: "This domain does not resolve on the Internet — it may have been deleted or never registered.",

      src_whitelist: "Server allowlist",
      src_ai_analysis: "AI v8 (CNN+BiLSTM → XGBoost)",
      src_database_blacklist: "Supabase blocklist",
      src_database_whitelist: "Supabase allowlist",
      src_urlhaus_database: "URLhaus",
      src_google_safe_browsing: "Google Safe Browsing",
      src_domain_check: "Domain check",
      src_unknown: "Unknown",
      risk_High: "High",
      risk_Medium: "Medium",
      risk_Low: "Low",
      risk_Unknown: "Unknown",

      errTimeout: "the server took too long to respond; it may be restarting",
      errNetwork: "could not connect to the analysis service",
      errHttp: "the server returned HTTP error {status}",
      errInvalid: "the server returned invalid data",
      errFormat: "invalid URL format: {reason}",
      errBlocked: "the server blocked this URL for security reasons",
      errModels: "the server hasn't finished loading the models",
      errServer: "the server encountered an internal error",
      errRate: "too many requests, please try again later",
      errBusy: "the server is busy, please try again later",
      errRequest: "the request is invalid or too long",
      errUnknown: "unknown error",

      // ---------- Domain information ----------
      diSummary: "Detailed domain information",
      diOverview: "Overview",
      diTls: "TLS certificate",
      diDomain: "Domain",
      diHost: "Host",
      diStatus: "Status",
      diCreated: "Registered",
      diExpires: "Expires",
      diUpdated: "Updated",
      diRegistrar: "Registrar",
      diAge: "Domain age",
      diNs: "Name servers",
      diValid: "Valid",
      diIssuer: "Issuer",
      diTlsExpires: "Expires",
      diValidity: "Validity",
      diVersion: "Version",
      diReachable: "Reachable",
      diStatusCode: "Status code",
      diFinalUrl: "Final URL",
      diRedirects: "Redirects",
      diServer: "Web server",
      diResponse: "Response time",
      diIp: "IP address",
      diGeo: "Location / ISP",
      diNotFound: "Not found",
      diActive: "Active",
      diInactive: "Inactive",
      diNonexistent: "Does not exist",
      diYes: "Yes",
      diNo: "No",
      diValidYes: "Valid",
      diValidNo: "Invalid",
      diDays: "{n} days",
      diDaysLeft: "{n} days left",
      diExpiredAgo: "Expired {n} days ago",
      diUnreachable: "No ({error})",
      diConnError: "connection error",
      diTlsError: "the TLS connection failed",
      diRedirectLimit: "too many redirects",
      diNoRedirect: "None",
      diMs: "{n} ms",

      // ---------- Report page ----------
      pageTitleReport: "Report a suspicious link – ScamShield-AI",
      metaReport: "Save and review personal reports in this browser.",
      reportTitle: "Report a suspicious link",
      reportLead: "Save suspicious links and your notes in this browser.",
      rfHeading: "Link details",
      rfIntro: "Fields marked * are required.",
      rfUrl: "URL to report",
      rfUrlPh: "e.g. https://example.com/path",
      rfUrlHint: "Paste the full link, including the path if there is one.",
      rfCategory: "Type of scam",
      rfDesc: "What happened",
      rfDescPh: "Where did you get the link, what did the site ask you to do…",
      rfCommit: "I confirm the information I provide is truthful.",
      rfSubmit: "Save report",
      errUrlEmpty: "Please enter the link you want to report.",
      errUrlInvalid: "That link isn't in a valid format, e.g. example.com/path.",
      errDescEmpty: "Please briefly describe what happened.",
      errCommit: "Please tick the confirmation box before submitting.",
      rfSuccessTitle: "Report saved in this browser",
      rfSuccessBody: "You can review the report in this browser. Scanning the same URL again shows a reference to the report.",
      rfSuccessScan: "Scan the reported link again",
      rfSaveFail: "Couldn't save the report — the browser is blocking local storage (localStorage).",
      asideTitle: "What happens to your report?",
      aside1Title: "Saved in your browser",
      aside1Desc: "Reports are stored locally on this device and are not uploaded to any server.",
      aside2Title: "Reference on future scans",
      aside2Desc: "Scanning the same URL shows a note that it was reported in this browser.",
      aside3Title: "Reporting to the authorities",
      aside3Desc: "To file an official report in Vietnam, you can also use the authorities' warning portal:",
      asideScan: "Not sure yet? Scan the link first",

      cat_phishing: "Fake website / credential phishing",
      cat_other: "Other",

      // ---------- Footer ----------
      footerDesc: "A tool for checking suspicious links: it combines an AI model with web address analysis and explains why.",
      footerSocial: "ScamShield-AI on social media",
      socialSoon: "{name} – no official page yet",
      footerTools: "Tools",
      footerScan: "Scan a URL",
      footerReport: "Report a scam",
      footerInfo: "Information",
      footerHow: "How ScamShield works",
      footerExam: "What we examine",
      footerWhen: "When to scan a URL",
      footerNotes: "Good to know",
      footerNote1: "Results are for reference only and do not replace verification with the official organisation.",
      footerNote2: "On a suspicious site: don't enter passwords, OTP codes or card details, and don't download unknown files.",
      footerNote3: "Links you scan are sent to the AI model server for analysis; scan history and reports stay in your browser.",
      footerProject: "Group project",
      footerDisclaimer: "Scan results are for reference only — always be careful before entering information or sending money.",
      footerData: "Training data: PhishVN, PhiUSIIL (CC BY 4.0).",
    },
  };

  // Tên tiếng Anh cho các hình thức lừa đảo trong SCAM_TYPES (js/report-categories.js). Giá trị lưu vẫn là tên tiếng Việt.
  const SCAM_TYPE_EN = {
    "Giả mạo ngân hàng": "Bank impersonation",
    "Mạo danh cơ quan chức năng": "Impersonating the authorities",
    "Việc nhẹ lương cao": "Fake jobs (easy work, high pay)",
    "Đầu tư lừa đảo": "Investment scam",
    "Trúng thưởng, quà tặng": "Prizes and giveaways",
    "Lừa đảo tình cảm": "Romance scam",
    "Deepfake & chiếm tài khoản": "Deepfake & account takeover",
    "Mua sắm online": "Online shopping scam",
  };

  // Tên tiếng Anh cho các tổ chức có tên tiếng Việt trong BRANDS_VN (js/dictionaries.js).
  const BRAND_EN = {
    "Cổng Dịch vụ công": "the National Public Service Portal",
    "Thuế điện tử": "the e-Tax portal",
    "Bảo hiểm xã hội": "Vietnam Social Security",
    "Bộ Công an": "the Ministry of Public Security",
  };

  // Nghĩa tiếng Anh của từ khoá tiếng Việt trong SCAM_KEYWORDS (theo khoá không dấu `k`).
  const KEYWORD_EN = {
    xacminh: "verify", xacthuc: "authenticate", hotro: "support", cskh: "customer care",
    khoataikhoan: "account lock", mokhoa: "unlock", hoantien: "refund", nhanqua: "claim a gift",
    trungthuong: "prize win", quatang: "gift", trian: "customer appreciation", uudai: "special offer",
    khuyenmai: "promotion", vaytien: "loan", giaingan: "loan disbursement", nangcap: "upgrade",
    nanghanmuc: "credit limit increase", capnhat: "update", dinhdanh: "identification",
    baomat: "security", tuyendung: "recruitment", dangnhap: "log in",
  };

  let current = "vi";
  const callbacks = [];
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "en" || stored === "vi") current = stored;
  } catch { /* localStorage bị chặn: dùng tiếng Việt mặc định. */ }

  // Lấy chuỗi theo ngôn ngữ hiện tại, thay {biến}. Thiếu khoá thì dùng bản tiếng Việt.
  function t(key, vars) {
    let s = DICTIONARY[current][key] ?? DICTIONARY.vi[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m));
    return s;
  }
  const get = () => current;
  const locale = () => LOCALES[current];

  // Đồng bộ các phần tử có data-i18n* (chỉ dùng chuỗi tĩnh trong DICTIONARY, không chèn dữ liệu người dùng).
  function apply() {
    const root = document.documentElement;
    root.lang = current;
    const body = document.body;
    if (body?.dataset.titleKey) document.title = t(body.dataset.titleKey);
    const meta = document.querySelector('meta[name="description"]');
    if (meta && body?.dataset.metaKey) meta.setAttribute("content", t(body.dataset.metaKey));
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel)));
    document.querySelectorAll("[data-i18n-title]").forEach((el) => { el.title = t(el.dataset.i18nTitle); });
    document.querySelectorAll("[data-lang]").forEach((el) => el.setAttribute("aria-pressed", String(el.dataset.lang === current)));
    callbacks.forEach((cb) => { try { cb(current); } catch (e) { console.error(e); } });
  }

  function set(lang) {
    if ((lang !== "vi" && lang !== "en") || lang === current) return;
    current = lang;
    try { localStorage.setItem(KEY, lang); } catch { /* bỏ qua */ }
    apply();
  }
  function onChange(cb) { callbacks.push(cb); }

  // ---------- Lý do của bộ quy tắc (js/url-analyzer.js) ----------
  function reason(item, url) {
    const positionKey = { sub: "partSub", dom: "partDom", path: "partPath" }[item.position];
    const where = positionKey ? t(positionKey) : "";
    if (item.group === "F2") {
      const gloss = current === "en" && Object.hasOwn(KEYWORD_EN, item.term) ? KEYWORD_EN[item.term] : "";
      return t("signalKeyword", { where, keyword: gloss || item.keyword });
    }
    const key = "signal_" + item.id;
    const brand = current === "en" && Object.hasOwn(BRAND_EN, item.brand) ? BRAND_EN[item.brand] : item.brand;
    return t(Object.hasOwn(DICTIONARY[current], key) ? key : "signalOther", {
      ...item, brand, where, tld: url.tld, sub: url.sub, port: url.port,
      domain: url.regDomain, unicode: url.hostUnicode,
    });
  }

  // ---------- Kết quả từ backend ----------
  const source = (src) => (src && DICTIONARY.vi[`src_${src}`] ? t(`src_${src}`) : src || t("src_unknown"));
  const risk = (lvl) => (lvl && DICTIONARY.vi[`risk_${lvl}`] ? t(`risk_${lvl}`) : lvl);

  // Ba câu cảnh báo cố định của backend (main.py → _attach_domain_info), nhận diện theo cụm đặc trưng.
  const WARNINGS_EN = [
    [/A\/AAAA/, "The domain exists but has no DNS record pointing to a web server (no A/AAAA) — it may no longer be in use."],
    [/HTTP\(S\)/, "The domain resolves in DNS but does not respond over HTTP(S) — it may be inactive or blocking access."],
    [/DNS\/HTTP không phản hồi/, "Couldn't check whether the domain is active (no DNS/HTTP response) — the AI result is still shown."],
  ];
  function aiWarning(text) {
    if (!text || current === "vi") return text;
    const hit = WARNINGS_EN.find(([re]) => re.test(text));
    return hit ? hit[1] : text;
  }

  function domainNotFound(ai, host) {
    const domain = typeof ai?.domain_info?.domain === "string" ? ai.domain_info.domain : host;
    if (current === "vi" && typeof ai?.message === "string" && ai.message) return ai.message;
    return domain ? t("domainNotFoundMsg", { domain }) : t("domainNotFoundFallback");
  }

  // Lý do định dạng do backend trả về (main.py → validate_url_format).
  const FORMAT_REASONS_EN = {
    "không phân tích được URL": "the URL could not be parsed",
    "URL phải bắt đầu bằng http:// hoặc https://": "the URL must start with http:// or https://",
    "thiếu tên miền (hostname)": "the hostname is missing",
    "tên miền quá dài": "the domain name is too long",
    "tên miền chứa ký tự không hợp lệ": "the domain name contains invalid characters",
    "tên miền thiếu phần mở rộng (ví dụ: .com, .vn)": "the domain name has no extension (e.g. .com, .vn)",
    "cổng (port) không hợp lệ": "the port is invalid",
    "cổng (port) ngoài khoảng 1-65535": "the port is outside the range 1–65535",
  };
  const BACKEND_ERRORS = {
    URL_BLOCKED: "errBlocked", MODEL_NOT_READY: "errModels", INTERNAL_ERROR: "errServer",
    RATE_LIMITED: "errRate", SERVER_BUSY: "errBusy", INVALID_REQUEST: "errRequest",
    REQUEST_TIMEOUT: "errTimeout",
  };

  function probeError(error) {
    if (error === "destination blocked" || error === "redirect to private/internal host (blocked)") return t("errBlocked");
    if (error === "timeout") return t("errTimeout");
    if (error === "TLS connection failed") return t("diTlsError");
    if (error === "too many redirects") return t("diRedirectLimit");
    return t("diConnError");
  }

  function aiError(r) {
    if (Object.hasOwn(BACKEND_ERRORS, r.aiBackendCode)) return t(BACKEND_ERRORS[r.aiBackendCode]);
    if (r.aiErrorStatus === 429) return t("errRate");
    if (r.aiErrorStatus === 503) return t("errBusy");
    if (r.aiErrorStatus >= 500) return t("errServer");
    switch (r.aiErrorCode) {
      case "timeout": return t("errTimeout");
      case "network": return t("errNetwork");
      case "http": return t("errHttp", { status: r.aiErrorStatus ?? "?" });
      case "invalid": return t("errInvalid");
      case "detail": {
        const d = String(r.aiErrorDetail || "");
        const fm = /^URL không đúng định dạng: (.+)$/.exec(d);
        if (fm && Object.hasOwn(FORMAT_REASONS_EN, fm[1])) {
          return t("errFormat", { reason: current === "en" ? FORMAT_REASONS_EN[fm[1]] : fm[1] });
        }
        if (d === "URL blocked for security reasons") return t("errBlocked");
        if (d === "Models not loaded") return t("errModels");
        return t("errServer");
      }
      default: return t("errUnknown");
    }
  }

  const scamType = (name) => current === "en" && Object.hasOwn(SCAM_TYPE_EN, name) ? SCAM_TYPE_EN[name] : name;

  return { t, get, set, apply, onChange, locale, reason, source, risk, aiWarning, aiError, probeError, domainNotFound, scamType };
})();
