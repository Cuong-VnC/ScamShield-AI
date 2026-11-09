/* ===========================================================================
   TRANG CHỦ: XỬ LÝ NHẬP URL, QUÉT VÀ CHUYỂN NGÔN NGỮ BÁO CÁO
   ----------------------------------------------------------------------------
   Chỉ một chế độ URL; không còn quét điện thoại, tài khoản, khóa học...
   =========================================================================== */

// Lưu ở bộ nhớ của trang để đổi VI/EN mà không phải thay đổi điểm rủi ro.
// Không lưu URL vào localStorage và không gửi URL ra ngoài.
let previousScan = null;

function runCheck() {
  const value = $('#checkInput').value.trim();
  if (!value) return;
  const result = analyzeUrl(value);
  previousScan = { value, result };

  // Dòng trạng thái scan://... được giữ từ frontend gốc.
  const state = { danger: 'threat', warn: 'suspicious', safe: 'clear' }[result.level];
  $('.checker-status').textContent = `scan://${state}`;
  renderScanResult($('#checkResult'), result, value);
}

// Nút quét: ngăn trình duyệt reload và gọi thuật toán URL có sẵn.
$('#checkForm').addEventListener('submit', event => {
  event.preventDefault();
  runCheck();
});

// Các ví dụ nhấp nhanh: chỉ điền vào ô rồi phân tích, không truy cập URL.
$$('.try').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  $('#checkInput').value = link.textContent.trim();
  runCheck();
}));

// Sau khi đổi ngôn ngữ, vẽ lại báo cáo dựa trên cùng một kết quả đã quét.
Language.onChange(() => {
  if (previousScan) renderScanResult($('#checkResult'), previousScan.result, previousScan.value);
});

// Giữ nguyên hai biến thống kê động của bộ từ điển thương hiệu và từ khóa.
$('#statBrands').dataset.count = BRANDS_VN.length;
$('#statKeywords').dataset.count = SCAM_KEYWORDS.length;
initCounters();
