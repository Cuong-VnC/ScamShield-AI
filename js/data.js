// Dữ liệu mẫu (demo). Thay bằng API thật khi triển khai.

const BLACKLIST = {
  url: [
    "vcb-hotro-khachhang.xyz",
    "vietcombank-xacthuc.top",
    "techcombank-nangcap.click",
    "mbbank-hoantien.online",
    "dichvucong-hoso.site",
    "shopee-tuyendung.top",
    "nhanqua-tiktok.xyz",
    "evn-hoantien.info",
    "vneid-capnhat.top",
  ],
  phone: ["0899123456", "0587111222", "0337654321", "02499998888"],
  bank: ["190366889999", "0451000123456", "1023456789"],
};

const NEWS = [
  { cat: "Ngân hàng", level: "high", title: "Giả mạo nhân viên ngân hàng yêu cầu 'nâng hạn mức thẻ'", desc: "Đối tượng gọi điện, gửi link giả để chiếm OTP và rút sạch tài khoản nạn nhân.", date: "02/11/2026",
    body: "Kẻ gian xưng là nhân viên ngân hàng, thông báo bạn được nâng hạn mức thẻ tín dụng miễn phí. Sau đó gửi đường link giả mạo giao diện ngân hàng, yêu cầu nhập số thẻ, ngày hết hạn, CVV và mã OTP. Ngân hàng không bao giờ yêu cầu khách hàng cung cấp OTP qua điện thoại hay đường link." },
  { cat: "Cơ quan nhà nước", level: "high", title: "Mạo danh công an gọi điện yêu cầu cập nhật định danh điện tử", desc: "Hướng dẫn cài ứng dụng giả mạo VNeID để chiếm quyền điều khiển điện thoại.", date: "31/10/2026",
    body: "Đối tượng gọi điện xưng là cán bộ công an, yêu cầu 'đồng bộ dữ liệu' hoặc 'nâng cấp tài khoản định danh mức 2'. Nạn nhân được hướng dẫn tải file APK lạ, ứng dụng này cấp quyền trợ năng cho kẻ gian để điều khiển điện thoại và chuyển tiền. Cơ quan công an không làm việc qua điện thoại và không hướng dẫn cài ứng dụng qua link." },
  { cat: "Việc làm", level: "mid", title: "Tuyển cộng tác viên 'chốt đơn' nhận hoa hồng 20%", desc: "Ban đầu được trả thưởng nhỏ, sau đó bị yêu cầu nạp tiền lớn để 'hoàn thành nhiệm vụ'.", date: "29/10/2026",
    body: "Kẻ gian tuyển cộng tác viên làm nhiệm vụ like, đánh giá sản phẩm hoặc đặt đơn ảo. Những nhiệm vụ đầu được trả tiền thật để tạo lòng tin. Sau đó nạn nhân bị yêu cầu nạp số tiền ngày càng lớn và không thể rút ra với lý do 'sai thao tác', 'cần hoàn thành chuỗi nhiệm vụ'." },
  { cat: "Mạng xã hội", level: "mid", title: "Hack Facebook/Zalo, dùng deepfake video gọi vay tiền", desc: "Video call vài giây với hình ảnh người quen, sau đó báo 'mạng yếu' rồi nhắn chuyển khoản.", date: "27/10/2026",
    body: "Sau khi chiếm tài khoản mạng xã hội, kẻ gian dùng công nghệ deepfake tạo video giả khuôn mặt chủ tài khoản để gọi video ngắn cho người thân, bạn bè rồi vay tiền. Hãy gọi điện thoại trực tiếp vào số quen thuộc và hỏi những câu chỉ người thật mới biết." },
  { cat: "Mua sắm", level: "info", title: "Shipper giả gọi thông báo đơn hàng, yêu cầu chuyển khoản phí ship", desc: "Lợi dụng mùa mua sắm cuối năm, nhiều người nhận đơn 'COD' không đặt.", date: "25/10/2026",
    body: "Đối tượng gọi điện xưng là shipper, nói có đơn hàng cần thanh toán và yêu cầu chuyển khoản trước hoặc quét mã QR. Hãy kiểm tra lịch sử đơn trong ứng dụng mua sắm và chỉ thanh toán khi thực sự đã đặt hàng." },
  { cat: "Đầu tư", level: "high", title: "Sàn đầu tư tiền ảo, ngoại hối cam kết lãi 30%/tháng", desc: "Nhóm Telegram 'chuyên gia' dẫn dắt, sau đó sàn khóa tài khoản khi nạp số tiền lớn.", date: "22/10/2026",
    body: "Các 'chuyên gia' trên mạng xã hội kéo nạn nhân vào nhóm kín, khoe lợi nhuận và hướng dẫn nạp tiền vào sàn không được cấp phép. Số dư hiển thị tăng nhanh nhưng khi rút tiền thì bị yêu cầu đóng 'phí', 'thuế' hoặc bị khóa tài khoản." },
];

const SCAM_TYPES = [
  { icon: "🏦", name: "Giả mạo ngân hàng", short: "Link giả, SMS brandname giả, yêu cầu OTP.",
    signs: ["Tin nhắn chứa đường link lạ dù hiển thị tên ngân hàng", "Thúc giục: 'tài khoản sẽ bị khóa trong 24h'", "Yêu cầu nhập OTP, mật khẩu vào website"],
    tips: ["Chỉ dùng ứng dụng chính thức của ngân hàng", "Gọi hotline in mặt sau thẻ để xác minh", "Không bao giờ cung cấp OTP cho bất kỳ ai"] },
  { icon: "👮", name: "Mạo danh cơ quan chức năng", short: "Công an, viện kiểm sát, thuế, điện lực…",
    signs: ["Gọi điện báo bạn liên quan vụ án, nợ thuế, nợ cước", "Yêu cầu chuyển tiền vào 'tài khoản tạm giữ'", "Hướng dẫn cài app qua link"],
    tips: ["Cơ quan nhà nước không làm việc qua điện thoại", "Không có 'tài khoản tạm giữ' nào cả", "Tắt máy và đến trực tiếp trụ sở để xác minh"] },
  { icon: "💼", name: "Việc nhẹ lương cao", short: "Làm nhiệm vụ online, CTV chốt đơn.",
    signs: ["Thu nhập cao bất thường cho việc đơn giản", "Phải nạp tiền trước mới được làm", "Liên lạc chỉ qua Telegram/Zalo"],
    tips: ["Công việc thật không yêu cầu bạn nạp tiền", "Tra cứu công ty trên cổng thông tin doanh nghiệp", "Dừng ngay khi được yêu cầu nạp thêm"] },
  { icon: "📈", name: "Đầu tư lừa đảo", short: "Tiền ảo, forex, đa cấp, lãi suất 'khủng'.",
    signs: ["Cam kết lợi nhuận cố định rất cao", "Sàn không được cấp phép tại Việt Nam", "Khuyến khích kéo thêm người tham gia"],
    tips: ["Lợi nhuận cao luôn đi kèm rủi ro cao", "Kiểm tra giấy phép của sàn", "Không tin 'chuyên gia' trên mạng xã hội"] },
  { icon: "🎁", name: "Trúng thưởng, quà tặng", short: "Nhận quà tri ân, trúng iPhone, xe máy.",
    signs: ["Bạn 'trúng thưởng' dù không tham gia", "Phải đóng phí/thuế để nhận quà", "Link khảo sát yêu cầu thông tin cá nhân"],
    tips: ["Không đóng bất kỳ khoản phí nhận thưởng nào", "Xác minh trên fanpage có tích xanh", "Không điền thông tin vào form lạ"] },
  { icon: "💔", name: "Lừa đảo tình cảm", short: "Làm quen qua mạng, gửi quà, nhờ đầu tư.",
    signs: ["Người lạ ở nước ngoài, ngoại hình hoàn hảo", "Từ chối gọi video hoặc gặp mặt", "Nhờ đóng phí nhận quà, hải quan"],
    tips: ["Tìm kiếm ảnh ngược để kiểm tra danh tính", "Không chuyển tiền cho người chưa gặp", "Chia sẻ với người thân khi có nghi ngờ"] },
  { icon: "🤖", name: "Deepfake & chiếm tài khoản", short: "Giả giọng, giả mặt người quen để vay tiền.",
    signs: ["Video call ngắn, hình ảnh mờ, mất tiếng", "Người quen đột ngột cần tiền gấp", "STK nhận tiền không phải của người quen"],
    tips: ["Gọi điện trực tiếp vào số quen thuộc", "Hỏi chi tiết chỉ người thật biết", "Bật xác thực 2 lớp cho mạng xã hội"] },
  { icon: "📦", name: "Mua sắm online", short: "Shop ảo, shipper giả, hàng không giao.",
    signs: ["Giá rẻ bất thường so với thị trường", "Yêu cầu chuyển khoản 100% trước", "Fanpage mới lập, bình luận bị khóa"],
    tips: ["Mua trên sàn uy tín, thanh toán qua sàn", "Kiểm tra lịch sử đơn trong app trước khi trả tiền", "Kiểm tra STK người bán tại mục Kiểm tra"] },
];


// Quy tắc phân tích tin nhắn (viết không dấu, chữ thường – nội dung được bỏ dấu trước khi so khớp).
const TEXT_RULES = [
  { re: /\botp\b|ma xac (thuc|nhan)|ma (bao mat|kich hoat)/, w: 35, type: "Giả mạo ngân hàng", flag: "Yêu cầu hoặc nhắc tới mã OTP / mã xác thực." },
  { re: /mat khau|password|ma pin|so the|cvv|ngay het han/, w: 30, type: "Giả mạo ngân hàng", flag: "Hỏi mật khẩu, mã PIN hoặc thông tin thẻ." },
  { re: /(tai khoan|tk|the).{0,30}(khoa|phong toa|dong bang|vo hieu)/, w: 25, type: "Giả mạo ngân hàng", flag: "Đe dọa khóa / phong tỏa tài khoản." },
  { re: /nang (cap|han muc)|hoan tien|xac (thuc|minh)|cap nhat (thong tin|sinh trac)/, w: 20, type: "Giả mạo ngân hàng", flag: "Yêu cầu xác thực, nâng cấp hoặc hoàn tiền qua kênh không chính thức." },
  { re: /cong an|vien kiem sat|toa an|canh sat|co quan dieu tra/, w: 20, type: "Mạo danh cơ quan chức năng", flag: "Xưng danh công an / cơ quan pháp luật." },
  { re: /rua tien|duong day|vu an|lenh bat|trieu tap/, w: 30, type: "Mạo danh cơ quan chức năng", flag: "Hù dọa bạn liên quan vụ án, rửa tiền." },
  { re: /tai khoan tam giu|chuyen tien.{0,20}(xac minh|chung minh)/, w: 35, type: "Mạo danh cơ quan chức năng", flag: "Yêu cầu chuyển tiền để “xác minh” – cơ quan nhà nước không làm vậy." },
  { re: /vneid|dinh danh (dien tu|muc 2)|dich vu cong|phat nguoi|no thue|no cuoc|tien dien/, w: 15, type: "Mạo danh cơ quan chức năng", flag: "Dùng danh nghĩa VNeID / dịch vụ công / thuế / điện lực." },
  { re: /\.apk\b|cai (dat )?(ung dung|app)|tai (ung dung|app)|quyen tro nang/, w: 30, type: "Mạo danh cơ quan chức năng", flag: "Hướng dẫn cài ứng dụng ngoài kho chính thức (nguy cơ bị chiếm điện thoại)." },
  { re: /viec nhe|luong cao|thu nhap (\d|cao|hap dan)|\d+k ?\/ ?ngay/, w: 25, type: "Việc nhẹ lương cao", flag: "Hứa hẹn thu nhập cao cho việc đơn giản." },
  { re: /cong tac vien|\bctv\b|lam tai nha|chot don|lam nhiem vu|like video|danh gia san pham/, w: 25, type: "Việc nhẹ lương cao", flag: "Tuyển cộng tác viên làm nhiệm vụ online (like, chốt đơn…)." },
  { re: /hoa hong|nap (tien|them)|nhiem vu vip|hoan thanh (chuoi )?nhiem vu|rut (tien )?(khong|chua) duoc/, w: 25, type: "Việc nhẹ lương cao", flag: "Yêu cầu nạp tiền để nhận hoa hồng / mở khóa rút tiền." },
  { re: /loi nhuan|lai (suat )?\d+ ?%|cam ket lai|dau tu|tien ao|crypto|forex|usdt|san giao dich|chuyen gia/, w: 20, type: "Đầu tư lừa đảo", flag: "Mời đầu tư, cam kết lợi nhuận cao." },
  { re: /trung thuong|qua tang|tri an|may man|phan thuong|nhan qua/, w: 25, type: "Trúng thưởng, quà tặng", flag: "Thông báo trúng thưởng / nhận quà bất ngờ." },
  { re: /phi (nhan|van chuyen|hai quan|thu tuc)|dong (phi|thue)|thue thu nhap/, w: 25, type: "Trúng thưởng, quà tặng", flag: "Đòi đóng phí / thuế trước khi nhận quà hoặc tiền." },
  { re: /hai quan|kien hang|goi qua tu|quan nhan|bac si (my|nuoc ngoai)/, w: 20, type: "Lừa đảo tình cảm", flag: "Câu chuyện quà gửi từ nước ngoài / người lạ ở nước ngoài." },
  { re: /(muon|vay|chuyen giup).{0,25}(tien|trieu|\dk\b|\dtr\b)|can gap|cap cuu|tai nan|benh vien/, w: 25, type: "Deepfake & chiếm tài khoản", flag: "Người quen nhờ chuyển tiền gấp." },
  { re: /shipper|giao hang|don hang|phi ship|\bcod\b/, w: 15, type: "Mua sắm online", flag: "Thông báo đơn hàng / yêu cầu thanh toán phí giao hàng." },
  { re: /\bgap\b|ngay lap tuc|trong (vong )?\d+ ?(h|gio|phut)\b|het han|khan cap|neu khong/, w: 15, type: null, flag: "Tạo áp lực thời gian, thúc giục làm ngay." },
  { re: /chuyen (khoan|tien)|\bstk\b|so tai khoan|quet ma qr/, w: 15, type: null, flag: "Có yêu cầu chuyển khoản." },
  { re: /bi mat|khong (duoc )?(noi|ke|chia se)/, w: 25, type: null, flag: "Yêu cầu giữ bí mật, không nói với người thân." },
  { re: /telegram|zalo rieng|ket ban zalo|nhan tin rieng/, w: 10, type: null, flag: "Dẫn dụ sang kênh chat riêng (Telegram/Zalo)." },
];

const TYPE_ADVICE = {
  "Giả mạo ngân hàng": ["Không bấm link, không cung cấp OTP/mật khẩu.", "Mở ứng dụng ngân hàng chính thức hoặc gọi hotline in trên thẻ để kiểm tra."],
  "Mạo danh cơ quan chức năng": ["Tắt máy, không làm theo hướng dẫn qua điện thoại.", "Không cài ứng dụng từ link; liên hệ trực tiếp trụ sở công an gần nhất nếu lo lắng."],
  "Việc nhẹ lương cao": ["Dừng ngay, không nạp thêm bất kỳ khoản tiền nào.", "Công việc thật không bao giờ yêu cầu bạn nạp tiền trước."],
  "Đầu tư lừa đảo": ["Không nạp tiền vào sàn/ứng dụng không được cấp phép.", "Lợi nhuận cam kết cao bất thường gần như chắc chắn là lừa đảo."],
  "Trúng thưởng, quà tặng": ["Không đóng bất kỳ khoản phí nào để nhận quà.", "Xác minh trên kênh chính thức của đơn vị tổ chức."],
  "Lừa đảo tình cảm": ["Không chuyển tiền cho người chưa từng gặp mặt.", "Chia sẻ câu chuyện với người thân để được góp ý."],
  "Deepfake & chiếm tài khoản": ["Gọi điện thoại trực tiếp vào số quen thuộc để xác minh.", "Hỏi chi tiết chỉ người thật mới biết trước khi chuyển tiền."],
  "Mua sắm online": ["Kiểm tra lịch sử đơn trong ứng dụng mua sắm trước khi trả tiền.", "Chỉ thanh toán qua sàn hoặc khi nhận hàng."],
};
