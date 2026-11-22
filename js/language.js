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
      aiTipOffline: "Chưa kết nối được máy chủ model AI ({api}). Trang sẽ tự thử lại; trong lúc chờ, kết quả quét chỉ dựa trên bộ quy tắc trên trình duyệt.",
      aiTipDegraded: "Máy chủ ({api}) có phản hồi nhưng model chưa được nạp.",
      toTop: "Lên đầu trang",

      // ---------- Trang chủ ----------
      pageTitleHome: "ScamShield-AI – Kiểm tra đường link trước khi truy cập",
      metaHome: "Dán đường link đáng ngờ để ScamShield-AI đánh giá rủi ro bằng mô hình AI và phân tích địa chỉ web, kèm giải thích các dấu hiệu cần chú ý.",
      heroTitle: 'Kiểm tra đường link <span class="hl">trước khi truy cập</span>',
      heroLead: "Dán đường link bạn nghi ngờ. ScamShield-AI kết hợp mô hình AI với phân tích địa chỉ web để đánh giá rủi ro và giải thích những dấu hiệu cần chú ý.",
      inputLabel: "Đường link cần kiểm tra",
      inputPlaceholder: "Dán đường link, ví dụ: https://vietcombank-xacthuc.top/login",
      scanBtn: "Quét URL",
      scanBusy: "Đang quét…",
      emptyInput: "Vui lòng dán một đường link để quét.",
      tick1: "Phân tích URL bằng AI",
      tick2: "Giải thích dấu hiệu rủi ro",
      tick3: "Không cần tạo tài khoản",
      statsLabel: "Dữ liệu và bộ nhận diện của ScamShield-AI",
      statPhishVN: "bản ghi URL bối cảnh Việt Nam (PhishVN)",
      statPhiUSIIL: "URL lừa đảo & hợp lệ quốc tế (PhiUSIIL)",
      statBrands: "thương hiệu được giám sát giả mạo",
      statKeywords: "từ khoá lừa đảo trong từ điển",

      // Thông báo cho trình đọc màn hình
      announcePending: "Đang quét đường link. Đã có kết quả sơ bộ từ bộ quy tắc, đang chờ model AI.",
      announceDone: "Đã có kết quả: {verdict}.",
      announceCleared: "Đã xoá lịch sử kiểm tra.",

      // ---------- Lịch sử ----------
      historyTitle: "Kiểm tra gần đây",
      historyNote: "Chỉ lưu trên trình duyệt này",
      historyClear: "Xoá lịch sử",
      historyRescan: "Quét lại",
      historyRescanAria: "Quét lại {url}",
      historyRules: "chỉ bộ quy tắc",
      historyAi: "có model AI",

      // ---------- Ba khu vực giữa trang ----------
      howTitle: "ScamShield hoạt động như thế nào?",
      howLead: "Ba bước ngắn từ lúc dán đường link đến khi nhận kết quả.",
      how1Title: "Nhập đường link",
      how1Desc: "Dán đường link đáng ngờ bạn nhận được vào ô quét ở đầu trang.",
      how2Title: "Phân tích rủi ro",
      how2Desc: "Model AI ở máy chủ và bộ quy tắc trên trình duyệt cùng xem xét những tín hiệu có trong đường link và tên miền.",
      how3Title: "Nhận kết quả",
      how3Desc: "Website hiển thị mức rủi ro, xác suất do model đưa ra và những dấu hiệu cần chú ý, kèm giải thích.",

      examTitle: "ScamShield kiểm tra những yếu tố nào?",
      examLead: "Mỗi lần quét kết hợp nhiều nhóm tín hiệu khác nhau để đưa ra đánh giá.",
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
      kickerPending: "Kết quả sơ bộ · đang chờ model AI",
      kickerFail: "Chỉ từ bộ quy tắc · chưa có kết quả model AI",
      kickerOk: "Kết quả kiểm tra · model AI + bộ quy tắc",
      kickerPlain: "Kết quả kiểm tra",
      titleDanger: "NGUY HIỂM – Nhiều dấu hiệu lừa đảo",
      titleWarn: "ĐÁNG NGỜ – Cần thận trọng",
      titleSafe: "RỦI RO THẤP – Chưa thấy dấu hiệu bất thường",
      titleNotFound: "TÊN MIỀN KHÔNG TỒN TẠI – Không truy cập được",
      titleInvalid: "Đường link không hợp lệ",
      invalidReason: "Vui lòng kiểm tra lại định dạng, ví dụ: tenmien.vn/duong-dan.",
      levelDanger: "Nguy hiểm",
      levelWarn: "Đáng ngờ",
      levelSafe: "Rủi ro thấp",
      targetLabel: "Đối tượng",
      partSub: "tên miền phụ",
      partDom: "tên miền chính",
      partSuf: "đuôi",
      partPath: "đường dẫn",
      partIp: "địa chỉ IP",
      realDisplay: "Hiển thị thật",
      probAi: "Xác suất lừa đảo (model AI)",
      scoreRules: "Điểm rủi ro ước tính của bộ quy tắc (không phải xác suất của model AI)",
      whyAi: "Dấu hiệu nhận thấy trong đường link",
      whyRules: "Vì sao có kết quả này?",
      noSignals: "Bộ quy tắc không phát hiện đặc trưng bất thường nào. Kết quả không đảm bảo an toàn tuyệt đối – hãy kiểm tra kỹ trước khi nhập thông tin.",
      contribNoteAi: "Phần giải thích do bộ quy tắc trên trình duyệt đưa ra (bộ quy tắc tự chấm: {score}/100); kết luận phía trên là của model AI.",
      contribNoteRules: "Thanh đỏ đẩy về phía lừa đảo, thanh xanh đẩy về phía an toàn.",
      contribLegend: "F1: cấu trúc · F2: từ khoá theo vị trí · F4: giả mạo thương hiệu.",
      groupList: "Danh sách",
      aiPending: "Đang hỏi model AI… Tạm hiện kết quả của bộ quy tắc trên trình duyệt.",
      aiPendingHint: "Nếu máy chủ vừa khởi động lại, lần đầu có thể mất tới khoảng một phút.",
      aiFail: "Chưa dùng được model AI ({error}). Kết quả dưới đây chỉ từ bộ quy tắc trên trình duyệt.",
      aiRetry: "Thử lại với model AI",
      chipSource: "Nguồn: {src}",
      chipRisk: "Mức rủi ro: {risk}",
      chipNn: "NN: {p}%",
      chipNnTip: "Xác suất của riêng mạng nơ-ron trước khi xếp chồng XGBoost",
      chipRules: "Bộ quy tắc: {score}/100",
      chipRulesTip: "Bộ quy tắc trên trình duyệt cho kết quả khác model AI",
      reportPrompt: "Bạn nghi ngờ đường link này?",
      reportLink: "Gửi báo cáo",
      domainNotFoundMsg: "Tên miền {domain} không tồn tại (DNS không phân giải được) — không thể truy cập.",
      domainNotFoundFallback: "Tên miền này không phân giải được trên Internet – có thể đã bị xoá hoặc chưa từng được đăng ký.",

      // Nguồn kết quả của backend
      src_whitelist: "Danh sách tin cậy của model",
      src_ai_analysis: "Model AI (CNN+BiLSTM → XGBoost)",
      src_database_blacklist: "Cơ sở dữ liệu đen",
      src_database_whitelist: "Cơ sở dữ liệu trắng",
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
      errNetwork: "không kết nối được máy chủ model AI",
      errHttp: "máy chủ trả về lỗi HTTP {status}",
      errInvalid: "dữ liệu trả về không hợp lệ",
      errFormat: "URL không đúng định dạng: {reason}",
      errBlocked: "máy chủ chặn URL này vì lý do bảo mật",
      errModels: "máy chủ chưa nạp xong model",
      errServer: "lỗi máy chủ: {detail}",
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
      diNoRedirect: "Không có",
      diMs: "{n} ms",

      // ---------- Trang báo cáo ----------
      pageTitleReport: "Báo cáo đường link đáng ngờ – ScamShield-AI",
      metaReport: "Lưu lại đường link có dấu hiệu lừa đảo ngay trên trình duyệt của bạn để được cảnh báo khi quét lại.",
      reportTitle: "Báo cáo đường link đáng ngờ",
      reportLead: "Chia sẻ đường link có dấu hiệu lừa đảo để bạn có thể lưu lại thông tin cảnh báo.",
      rfHeading: "Thông tin đường link",
      rfIntro: "Các mục có dấu * là bắt buộc.",
      rfUrl: "URL cần báo cáo",
      rfUrlPh: "Ví dụ: https://tenmien-dang-ngo.top/dang-nhap",
      rfUrlHint: "Dán nguyên đường link, gồm cả đường dẫn nếu có.",
      rfCategory: "Hình thức lừa đảo",
      rfDesc: "Mô tả sự việc",
      rfDescPh: "Bạn nhận được đường link ở đâu, trang web yêu cầu bạn làm gì…",
      rfCommit: "Tôi cam kết thông tin cung cấp là trung thực.",
      rfSubmit: "Gửi báo cáo",
      errUrlEmpty: "Vui lòng nhập đường link cần báo cáo.",
      errUrlInvalid: "Đường link chưa đúng định dạng, ví dụ: tenmien.vn/duong-dan.",
      errDescEmpty: "Vui lòng mô tả ngắn gọn sự việc.",
      errCommit: "Vui lòng đánh dấu ô cam kết trước khi gửi.",
      rfSuccessTitle: "Đã lưu báo cáo trên trình duyệt này",
      rfSuccessBody: "ScamShield-AI chưa có máy chủ tiếp nhận báo cáo, vì vậy báo cáo chưa được gửi đi đâu. Khi bạn quét lại tên miền này trên trình duyệt này, nó sẽ được đánh dấu nguy hiểm.",
      rfSuccessScan: "Quét lại đường link vừa báo cáo",
      rfSaveFail: "Không lưu được báo cáo – trình duyệt đang chặn bộ nhớ cục bộ (localStorage).",
      asideTitle: "Báo cáo của bạn được xử lý thế nào?",
      aside1Title: "Lưu ngay trên trình duyệt",
      aside1Desc: "Báo cáo được lưu cục bộ trên thiết bị này và không gửi lên máy chủ nào.",
      aside2Title: "Cảnh báo khi quét lại",
      aside2Desc: "Tên miền bạn đã báo cáo luôn được đánh dấu nguy hiểm khi quét lại trên trình duyệt này.",
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
      aiTipOffline: "Can't reach the AI model server ({api}). The page will retry automatically; until then, scan results rely only on the in-browser rule set.",
      aiTipDegraded: "The server ({api}) responds, but its models are not loaded yet.",
      toTop: "Back to top",

      // ---------- Home ----------
      pageTitleHome: "ScamShield-AI – Check a link before you visit",
      metaHome: "Paste a suspicious link and ScamShield-AI assesses its risk with an AI model and web address analysis, explaining the signs worth noticing.",
      heroTitle: 'Check a link <span class="hl">before you visit</span>',
      heroLead: "Paste a link you're unsure about. ScamShield-AI combines an AI model with web address analysis to assess the risk and explain the warning signs worth noticing.",
      inputLabel: "Link to check",
      inputPlaceholder: "Paste a link, e.g. https://vietcombank-xacthuc.top/login",
      scanBtn: "Scan URL",
      scanBusy: "Scanning…",
      emptyInput: "Please paste a link to scan.",
      tick1: "AI-powered URL analysis",
      tick2: "Explains the risk signals",
      tick3: "No account needed",
      statsLabel: "ScamShield-AI data and detection sets",
      statPhishVN: "Vietnam-context URL records (PhishVN)",
      statPhiUSIIL: "international phishing & legitimate URLs (PhiUSIIL)",
      statBrands: "brands monitored for impersonation",
      statKeywords: "scam keywords in the dictionary",

      announcePending: "Scanning the link. A preliminary rule-set result is ready; waiting for the AI model.",
      announceDone: "Result ready: {verdict}.",
      announceCleared: "Scan history cleared.",

      // ---------- History ----------
      historyTitle: "Recent scans",
      historyNote: "Stored only in this browser",
      historyClear: "Clear history",
      historyRescan: "Scan again",
      historyRescanAria: "Scan {url} again",
      historyRules: "rules only",
      historyAi: "with AI model",

      // ---------- Middle sections ----------
      howTitle: "How ScamShield works",
      howLead: "Three short steps from pasting a link to getting a result.",
      how1Title: "Paste the link",
      how1Desc: "Paste the suspicious link you received into the scan box at the top of the page.",
      how2Title: "Risk analysis",
      how2Desc: "The AI model on the server and the rule set in your browser examine the signals found in the link and its domain.",
      how3Title: "Get the result",
      how3Desc: "The site shows the risk level, the model's probability and the signs worth noticing, each with an explanation.",

      examTitle: "What ScamShield examines",
      examLead: "Every scan combines several groups of signals to reach an assessment.",
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
      kickerPending: "Preliminary result · waiting for the AI model",
      kickerFail: "Rule set only · no AI model result yet",
      kickerOk: "Scan result · AI model + rule set",
      kickerPlain: "Scan result",
      titleDanger: "DANGEROUS – Multiple scam indicators",
      titleWarn: "SUSPICIOUS – Proceed with caution",
      titleSafe: "LOW RISK – No unusual signs found",
      titleNotFound: "DOMAIN DOES NOT EXIST – Cannot be reached",
      titleInvalid: "Invalid link",
      invalidReason: "Please check the format, e.g. example.com/path.",
      levelDanger: "Dangerous",
      levelWarn: "Suspicious",
      levelSafe: "Low risk",
      targetLabel: "Target",
      partSub: "subdomain",
      partDom: "main domain",
      partSuf: "suffix",
      partPath: "path",
      partIp: "IP address",
      realDisplay: "Actual display",
      probAi: "Phishing probability (AI model)",
      scoreRules: "Estimated risk score from the rule set (not an AI model probability)",
      whyAi: "Signals found in the link",
      whyRules: "Why this result?",
      noSignals: "The rule set found no unusual features. This does not guarantee safety — double-check before entering any information.",
      contribNoteAi: "These explanations come from the in-browser rule set (its own score: {score}/100); the verdict above comes from the AI model.",
      contribNoteRules: "Red bars push towards scam, green bars push towards safe.",
      contribLegend: "F1: structure · F2: position-based keywords · F4: brand impersonation.",
      groupList: "List",
      aiPending: "Asking the AI model… Showing the in-browser rule-set result for now.",
      aiPendingHint: "If the server has just restarted, the first scan can take up to about a minute.",
      aiFail: "The AI model is unavailable ({error}). The result below comes only from the in-browser rule set.",
      aiRetry: "Retry with the AI model",
      chipSource: "Source: {src}",
      chipRisk: "Risk level: {risk}",
      chipNn: "NN: {p}%",
      chipNnTip: "Probability from the neural network alone, before XGBoost stacking",
      chipRules: "Rule set: {score}/100",
      chipRulesTip: "The in-browser rule set disagrees with the AI model",
      reportPrompt: "Suspicious of this link?",
      reportLink: "Report it",
      domainNotFoundMsg: "The domain {domain} does not exist (DNS could not resolve it) — it cannot be reached.",
      domainNotFoundFallback: "This domain does not resolve on the Internet — it may have been deleted or never registered.",

      src_whitelist: "Model's trusted list",
      src_ai_analysis: "AI model (CNN+BiLSTM → XGBoost)",
      src_database_blacklist: "Blocklist database",
      src_database_whitelist: "Allowlist database",
      src_urlhaus_database: "URLhaus",
      src_google_safe_browsing: "Google Safe Browsing",
      src_domain_check: "Domain check",
      src_unknown: "Unknown",
      risk_High: "High",
      risk_Medium: "Medium",
      risk_Low: "Low",
      risk_Unknown: "Unknown",

      errTimeout: "the server took too long to respond; it may be restarting",
      errNetwork: "couldn't connect to the AI model server",
      errHttp: "the server returned HTTP error {status}",
      errInvalid: "the server returned invalid data",
      errFormat: "invalid URL format: {reason}",
      errBlocked: "the server blocked this URL for security reasons",
      errModels: "the server hasn't finished loading the models",
      errServer: "server error: {detail}",
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
      diNoRedirect: "None",
      diMs: "{n} ms",

      // ---------- Report page ----------
      pageTitleReport: "Report a suspicious link – ScamShield-AI",
      metaReport: "Save a link that shows signs of a scam right in your browser so you get a warning when you scan it again.",
      reportTitle: "Report a suspicious link",
      reportLead: "Share a link that shows signs of a scam so you can keep a record of the warning.",
      rfHeading: "Link details",
      rfIntro: "Fields marked * are required.",
      rfUrl: "URL to report",
      rfUrlPh: "e.g. https://suspicious-domain.top/login",
      rfUrlHint: "Paste the full link, including the path if there is one.",
      rfCategory: "Type of scam",
      rfDesc: "What happened",
      rfDescPh: "Where did you get the link, what did the site ask you to do…",
      rfCommit: "I confirm the information I provide is truthful.",
      rfSubmit: "Submit report",
      errUrlEmpty: "Please enter the link you want to report.",
      errUrlInvalid: "That link isn't in a valid format, e.g. example.com/path.",
      errDescEmpty: "Please briefly describe what happened.",
      errCommit: "Please tick the confirmation box before submitting.",
      rfSuccessTitle: "Report saved in this browser",
      rfSuccessBody: "ScamShield-AI doesn't have a report server yet, so the report hasn't been sent anywhere. When you scan this domain again in this browser, it will be flagged as dangerous.",
      rfSuccessScan: "Scan the reported link again",
      rfSaveFail: "Couldn't save the report — the browser is blocking local storage (localStorage).",
      asideTitle: "What happens to your report?",
      aside1Title: "Saved in your browser",
      aside1Desc: "Reports are stored locally on this device and are not uploaded to any server.",
      aside2Title: "Flagged on future scans",
      aside2Desc: "A domain you reported is always flagged as dangerous when you scan it again in this browser.",
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

  // Tên tiếng Anh cho các hình thức lừa đảo trong SCAM_TYPES (js/data.js). Giá trị lưu vẫn là tên tiếng Việt.
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
  const POS_EN = { "tên miền phụ": "subdomain", "tên miền chính": "main domain", "đường dẫn": "path" };
  const brandName = (name) => (current === "en" && BRAND_EN[name]) || name;
  const num = (text, re) => (re.exec(text) || [])[1] ?? "?";

  // Mỗi lý do có id cố định → dịch theo id, giữ nguyên tên miền / thương hiệu / con số.
  // Không có bản dịch thì trả về câu tiếng Việt gốc (không tự suy diễn).
  function reason(item, p) {
    if (current === "vi") return item.text;
    const s = item.text;
    let m;
    switch (item.id) {
      case "blacklisted": return "The domain is on the list of sites reported for scams.";
      case "official_domain":
        m = /^Tên miền chính thức của (.+)\.$/.exec(s);
        return m ? `Official domain of ${brandName(m[1])}.` : s;
      case "gov_edu_vn": return `Only government agencies and schools can register the .${p.suffix} ending.`;
      case "host_is_ip": return "Uses an IP address instead of a domain name.";
      case "at_symbol": return "Contains an “@” before the domain — a trick used to hide the real destination.";
      case "tld_risk": return `The “.${p.tld}” ending is often abused for scam sites.`;
      case "shortener": return "Shortened link — the real destination is hidden.";
      case "free_hosting": return `Page built on a free hosting platform (${p.suffix}).`;
      case "user_content": return `A user-created page on ${p.host}, not a page run by Google.`;
      case "deep_subdomain": return `Has ${num(s, /Có (\d+) cấp/)} nested subdomain levels.`;
      case "domain_in_subdomain": return `The subdomain “${p.sub}” poses as a complete domain name.`;
      case "many_hyphens": return `The main domain has ${num(s, /có (\d+) dấu gạch ngang/)} hyphens.`;
      case "digit_ratio": return "The domain contains many digits.";
      case "long_host": return `Unusually long domain (${num(s, /\((\d+) ký tự\)/)} characters).`;
      case "random_host": return "The domain looks like a random string of characters.";
      case "odd_port": return `Uses an unusual port (:${p.port}).`;
      case "long_url": return `Very long link (${num(s, /\((\d+) ký tự\)/)} characters).`;
      case "embedded_url": return "The path contains another link (possible redirect).";
      case "brand_in_path":
        m = /^Đường dẫn nhắc tới (.+) nhưng trang không thuộc (.+)\.$/.exec(s);
        return m ? `The path mentions ${brandName(m[1])}, but the site is not on ${m[2]}.` : s;
      case "brand_outside_regdomain":
        m = /^Tên (.+) xuất hiện ở (tên miền phụ|tên miền chính|đường dẫn), nhưng tên miền chính lại là “(.+)” \(trang thật: (.+)\)\.$/.exec(s);
        return m ? `${brandName(m[1])} appears in the ${POS_EN[m[2]]}, but the registered domain is “${m[3]}” (genuine site: ${m[4]}).` : s;
      case "homoglyph":
        m = /^“(.+)” dùng ký tự trông giống chữ cái để giả “(.+)” \((.+)\)\.$/.exec(s);
        return m ? `“${m[1]}” uses lookalike characters to imitate “${m[2]}” (${brandName(m[3])}).` : s;
      case "typosquat":
        m = /^“(.+)” viết gần giống “(.+)” \((.+)\) – kiểu gõ sai cố ý\.$/.exec(s);
        return m ? `“${m[1]}” is spelled almost like “${m[2]}” (${brandName(m[3])}) — a deliberate typo.` : s;
      case "punycode": return `The domain uses international characters (punycode); it actually displays as “${p.hostUnicode}”.`;
      default: {
        // Từ khoá F2: id dạng sub:khoa, dom:khoa, path:khoa
        m = /^(sub|dom|path):(.+)$/.exec(item.id);
        if (m) {
          const where = { sub: "Subdomain", dom: "Main domain", path: "Path" }[m[1]];
          const kw = (/“([^”]*)”/.exec(s) || [])[1] || m[2];
          const gloss = KEYWORD_EN[m[2]];
          return `${where} contains the keyword “${kw}”${gloss ? ` (${gloss})` : ""}.`;
        }
        return s;
      }
    }
  }
  const group = (label) => (label === "Danh sách" ? t("groupList") : label);

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
    const domain = ai?.domain_info?.domain || host;
    if (current === "vi") return ai?.message || t("domainNotFoundFallback"); // giống mergeAiResult của bản gốc
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
  // r: { aiErrorCode, aiErrorStatus, aiErrorDetail, aiError } do scan.js lưu lại.
  function aiError(r) {
    switch (r.aiErrorCode) {
      case "timeout": return t("errTimeout");
      case "network": return t("errNetwork");
      case "http": return t("errHttp", { status: r.aiErrorStatus ?? "?" });
      case "invalid": return t("errInvalid");
      case "detail": {
        const d = String(r.aiErrorDetail || "");
        const fm = /^URL không đúng định dạng: (.+)$/.exec(d);
        if (fm) return t("errFormat", { reason: current === "en" ? FORMAT_REASONS_EN[fm[1]] || fm[1] : fm[1] });
        if (d === "URL blocked for security reasons") return t("errBlocked");
        if (d === "Models not loaded") return t("errModels");
        return t("errServer", { detail: d });
      }
      default: return r.aiError || t("errUnknown");
    }
  }

  const scamType = (name) => (current === "en" && SCAM_TYPE_EN[name]) || name;

  return { t, get, set, apply, onChange, locale, reason, group, source, risk, aiWarning, aiError, domainNotFound, scamType };
})();
