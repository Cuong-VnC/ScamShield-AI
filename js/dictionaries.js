// Từ điển dùng cho bộ phân tích URL (tương ứng brands_vn.txt / scam_keywords_vn.txt trong tài liệu dự án).
// Tất cả viết thường, không dấu.

// Thương hiệu hay bị giả mạo + tên miền chính thức.
// keys: các chuỗi nhận diện thương hiệu trong URL. Key <= 4 ký tự chỉ được tính khi đứng thành từ riêng.
const BRANDS_VN = [
  // Ngân hàng
  { name: "Vietcombank", group: "Ngân hàng", keys: ["vietcombank", "vcb"], domains: ["vietcombank.com.vn"] },
  { name: "Techcombank", group: "Ngân hàng", keys: ["techcombank", "tcb"], domains: ["techcombank.com", "techcombank.com.vn"] },
  { name: "MB Bank", group: "Ngân hàng", keys: ["mbbank"], domains: ["mbbank.com.vn"] },
  { name: "BIDV", group: "Ngân hàng", keys: ["bidv"], domains: ["bidv.com.vn"] },
  { name: "VietinBank", group: "Ngân hàng", keys: ["vietinbank"], domains: ["vietinbank.vn"] },
  { name: "Agribank", group: "Ngân hàng", keys: ["agribank"], domains: ["agribank.com.vn"] },
  { name: "TPBank", group: "Ngân hàng", keys: ["tpbank"], domains: ["tpb.vn"] },
  { name: "ACB", group: "Ngân hàng", keys: ["acb"], domains: ["acb.com.vn"] },
  { name: "VPBank", group: "Ngân hàng", keys: ["vpbank"], domains: ["vpbank.com.vn"] },
  { name: "Sacombank", group: "Ngân hàng", keys: ["sacombank"], domains: ["sacombank.com.vn"] },
  { name: "VIB", group: "Ngân hàng", keys: ["vib"], domains: ["vib.com.vn"] },
  { name: "HDBank", group: "Ngân hàng", keys: ["hdbank"], domains: ["hdbank.com.vn"] },
  { name: "SHB", group: "Ngân hàng", keys: ["shb"], domains: ["shb.com.vn"] },
  // Ví điện tử, thanh toán
  { name: "MoMo", group: "Ví điện tử", keys: ["momo"], domains: ["momo.vn"] },
  { name: "ZaloPay", group: "Ví điện tử", keys: ["zalopay"], domains: ["zalopay.vn"] },
  { name: "VNPay", group: "Ví điện tử", keys: ["vnpay"], domains: ["vnpay.vn"] },
  // Sàn TMĐT, mạng xã hội
  { name: "Shopee", group: "TMĐT", keys: ["shopee"], domains: ["shopee.vn"] },
  { name: "Lazada", group: "TMĐT", keys: ["lazada"], domains: ["lazada.vn"] },
  { name: "Tiki", group: "TMĐT", keys: ["tiki"], domains: ["tiki.vn"] },
  { name: "TikTok", group: "Mạng xã hội", keys: ["tiktok"], domains: ["tiktok.com"] },
  { name: "Zalo", group: "Mạng xã hội", keys: ["zalo"], domains: ["zalo.me", "zalo.vn"] },
  { name: "Facebook", group: "Mạng xã hội", keys: ["facebook", "fb"], domains: ["facebook.com", "fb.com", "messenger.com"] },
  // Nhà mạng
  { name: "Viettel", group: "Nhà mạng", keys: ["viettel"], domains: ["viettel.vn", "viettel.com.vn"] },
  { name: "VNPT", group: "Nhà mạng", keys: ["vnpt"], domains: ["vnpt.vn"] },
  { name: "MobiFone", group: "Nhà mạng", keys: ["mobifone"], domains: ["mobifone.vn"] },
  // Cơ quan nhà nước, dịch vụ công
  { name: "VNeID", group: "Cơ quan nhà nước", keys: ["vneid"], domains: ["vneid.gov.vn"] },
  { name: "Cổng Dịch vụ công", group: "Cơ quan nhà nước", keys: ["dichvucong"], domains: ["dichvucong.gov.vn"] },
  { name: "Thuế điện tử", group: "Cơ quan nhà nước", keys: ["thuedientu"], domains: ["gdt.gov.vn"] },
  { name: "Bảo hiểm xã hội", group: "Cơ quan nhà nước", keys: ["baohiemxahoi", "bhxh"], domains: ["baohiemxahoi.gov.vn"] },
  { name: "Bộ Công an", group: "Cơ quan nhà nước", keys: ["bocongan", "congan"], domains: ["bocongan.gov.vn"] },
  { name: "EVN", group: "Cơ quan nhà nước", keys: ["evn"], domains: ["evn.com.vn"] },
  // Vận chuyển
  { name: "VNPost", group: "Vận chuyển", keys: ["vnpost"], domains: ["vnpost.vn"] },
  { name: "Viettel Post", group: "Vận chuyển", keys: ["viettelpost"], domains: ["viettelpost.com.vn"] },
  { name: "Giao Hàng Nhanh", group: "Vận chuyển", keys: ["ghn"], domains: ["ghn.vn"] },
  { name: "Giao Hàng Tiết Kiệm", group: "Vận chuyển", keys: ["ghtk"], domains: ["ghtk.vn"] },
  // Quốc tế
  { name: "Google", group: "Quốc tế", keys: ["google", "gmail"], domains: ["google.com", "google.com.vn", "gmail.com", "youtube.com"] },
  { name: "Apple", group: "Quốc tế", keys: ["apple", "icloud"], domains: ["apple.com", "icloud.com"] },
  { name: "Microsoft", group: "Quốc tế", keys: ["microsoft", "outlook", "office365"], domains: ["microsoft.com", "live.com", "office.com", "outlook.com"] },
  { name: "PayPal", group: "Quốc tế", keys: ["paypal"], domains: ["paypal.com"] },
  { name: "Netflix", group: "Quốc tế", keys: ["netflix"], domains: ["netflix.com"] },
  { name: "Amazon", group: "Quốc tế", keys: ["amazon"], domains: ["amazon.com"] },
  { name: "Binance", group: "Quốc tế", keys: ["binance"], domains: ["binance.com"] },
];

// Từ khoá lừa đảo. w = trọng số gốc (nhân thêm theo vị trí xuất hiện).
const SCAM_KEYWORDS = [
  { k: "xacminh", t: "xác minh", w: 1.0 }, { k: "xacthuc", t: "xác thực", w: 1.0 },
  { k: "hotro", t: "hỗ trợ", w: 0.8 }, { k: "cskh", t: "CSKH", w: 0.8 },
  { k: "khoataikhoan", t: "khóa tài khoản", w: 1.2 }, { k: "mokhoa", t: "mở khóa", w: 1.0 },
  { k: "hoantien", t: "hoàn tiền", w: 1.0 }, { k: "nhanqua", t: "nhận quà", w: 1.0 },
  { k: "trungthuong", t: "trúng thưởng", w: 1.2 }, { k: "quatang", t: "quà tặng", w: 0.8 },
  { k: "trian", t: "tri ân", w: 0.8 }, { k: "uudai", t: "ưu đãi", w: 0.6 },
  { k: "khuyenmai", t: "khuyến mại", w: 0.5 }, { k: "vaytien", t: "vay tiền", w: 0.8 },
  { k: "giaingan", t: "giải ngân", w: 0.8 }, { k: "nangcap", t: "nâng cấp", w: 0.8 },
  { k: "nanghanmuc", t: "nâng hạn mức", w: 1.2 }, { k: "capnhat", t: "cập nhật", w: 0.6 },
  { k: "dinhdanh", t: "định danh", w: 0.8 }, { k: "baomat", t: "bảo mật", w: 0.6 },
  { k: "tuyendung", t: "tuyển dụng", w: 0.6 }, { k: "dangnhap", t: "đăng nhập", w: 0.6 },
  { k: "login", t: "login", w: 0.6 }, { k: "signin", t: "signin", w: 0.6 },
  { k: "verify", t: "verify", w: 0.8 }, { k: "verification", t: "verification", w: 0.8 },
  { k: "secure", t: "secure", w: 0.6 }, { k: "update", t: "update", w: 0.5 },
  { k: "account", t: "account", w: 0.4 }, { k: "confirm", t: "confirm", w: 0.6 },
  { k: "unlock", t: "unlock", w: 0.8 }, { k: "support", t: "support", w: 0.5 },
  { k: "wallet", t: "wallet", w: 0.5 }, { k: "bonus", t: "bonus", w: 0.6 },
  { k: "gift", t: "gift", w: 0.6 }, { k: "claim", t: "claim", w: 0.6 },
  { k: "recovery", t: "recovery", w: 0.6 }, { k: "suspend", t: "suspend", w: 0.8 },
];

// Từ thông dụng (không mang tín hiệu) – giúp bộ tách từ không dấu tách đúng.
const COMMON_WORDS = [
  "khach", "hang", "khachhang", "tai", "khoan", "taikhoan", "ngan", "nganhang", "dich", "vu", "dichvu",
  "cong", "the", "so", "online", "app", "web", "mobile", "ebank", "ibank", "portal", "home", "service",
  "center", "official", "chinh", "thuc", "tin", "tuc", "news", "kinh", "te", "blog", "shop", "store",
  "vn", "viet", "nam", "vietnam", "my", "id", "user", "page", "www", "mail",
];

// Đuôi tên miền nhiều cấp (rút gọn từ Public Suffix List). Đuôi 1 cấp được xử lý mặc định.
const PUBLIC_SUFFIXES = [
  "com.vn", "net.vn", "org.vn", "edu.vn", "gov.vn", "ac.vn", "info.vn", "biz.vn", "name.vn",
  "pro.vn", "health.vn", "int.vn", "id.vn", "io.vn",
  "co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "net.au", "co.jp", "co.kr", "com.cn",
  "com.sg", "com.my", "co.th", "co.id", "com.br", "co.in", "com.tw", "com.hk", "com.ph",
  // Nền tảng cho người dùng tự tạo trang (private suffix) – mỗi trang con là một "chủ" khác nhau.
  "web.app", "firebaseapp.com", "pages.dev", "workers.dev", "r2.dev", "github.io", "vercel.app",
  "netlify.app", "blogspot.com", "weebly.com", "wixsite.com", "glitch.me", "ngrok.io",
  "ngrok-free.app", "onrender.com", "herokuapp.com", "repl.co", "000webhostapp.com",
];

// Nền tảng tạo trang miễn phí (thường bị dùng để host trang giả mạo).
const HOSTING_PLATFORMS = PUBLIC_SUFFIXES.slice(PUBLIC_SUFFIXES.indexOf("web.app"));
// Trang do người dùng tạo nằm dưới tên miền lớn – không được hưởng độ tin cậy của tên miền đó.
const USER_CONTENT_HOSTS = ["sites.google.com", "docs.google.com", "forms.gle", "script.google.com"];

// Dịch vụ rút gọn link.
const SHORTENERS = [
  "bit.ly", "bitly.com", "tinyurl.com", "t.co", "goo.gl", "is.gd", "cutt.ly", "rb.gy", "shorturl.at",
  "tiny.cc", "ow.ly", "s.id", "v.gd", "rebrand.ly", "t.ly",
];

// Đuôi tên miền thường bị lạm dụng (trọng số).
const TLD_RISK = {
  top: 1.5, xyz: 1.5, click: 1.5, icu: 1.5, cyou: 1.5, sbs: 1.5, cfd: 1.5, buzz: 1.5, tk: 1.5,
  ml: 1.5, ga: 1.5, cf: 1.5, gq: 1.5, rest: 1.2, bond: 1.2, monster: 1.2, lol: 1.2,
  online: 1.0, site: 1.0, live: 1.0, vip: 1.0, shop: 0.8, store: 0.8, fun: 1.0, space: 1.0,
  website: 1.0, pw: 1.0, work: 0.8, link: 1.0, info: 0.8, cc: 0.8, life: 0.6, asia: 0.6,
};
