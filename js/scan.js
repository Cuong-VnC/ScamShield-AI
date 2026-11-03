// Kiểm tra URL / số điện thoại / số tài khoản và hiển thị kết quả. Dùng ở trang chủ và trang tin nhắn.

const URL_TITLES = {
  danger: "NGUY HIỂM – Nhiều dấu hiệu lừa đảo",
  warn: "ĐÁNG NGỜ – Cần thận trọng",
  safe: "AN TOÀN – Chưa thấy dấu hiệu bất thường",
};

// Gọi bộ phân tích URL (js/url-analyzer.js), kèm danh sách đen + báo cáo cộng đồng.
function analyzeUrl(input) {
  const reported = getReports().filter((r) => r.type === "url").map((r) => UrlAnalyzer.parse(r.target)?.host).filter(Boolean);
  const r = UrlAnalyzer.analyze(input, { blacklist: [...BLACKLIST.url, ...reported] });
  if (!r.valid) return { level: "warn", title: "Đường link không hợp lệ", target: input, score: 50, reasons: ["Vui lòng kiểm tra lại định dạng, ví dụ: tenmien.vn/duong-dan."] };
  return { ...r, target: r.parsed.host, title: URL_TITLES[r.level] };
}

function analyzeNumber(input, type) {
  const digits = input.replace(/\D/g, "");
  const label = type === "phone" ? "Số điện thoại" : "Số tài khoản";
  if (type === "phone" && !/^(0|84)\d{8,10}$/.test(digits))
    return { level: "warn", title: "Số điện thoại không hợp lệ", target: input, score: 50, reasons: ["Số điện thoại Việt Nam gồm 10 chữ số, bắt đầu bằng 0."] };
  if (type === "bank" && (digits.length < 6 || digits.length > 19))
    return { level: "warn", title: "Số tài khoản không hợp lệ", target: input, score: 50, reasons: ["Số tài khoản thường có từ 6 đến 19 chữ số."] };

  const norm = type === "phone" ? digits.replace(/^84/, "0") : digits;
  const reports = getReports().filter((r) => r.type === type && r.target.replace(/\D/g, "").replace(/^84/, "0") === norm);
  if (BLACKLIST[type].includes(norm) || reports.length) {
    const n = reports.length + (BLACKLIST[type].includes(norm) ? 7 + (norm.length % 9) : 0);
    return { level: "danger", title: `NGUY HIỂM – ${label} bị báo cáo lừa đảo`, target: norm, score: 100,
      reasons: [`Đã có ${n} báo cáo từ cộng đồng.`, type === "phone" ? "Không nghe máy, không làm theo hướng dẫn, chặn số này." : "Tuyệt đối không chuyển tiền vào tài khoản này."] };
  }
  return { level: "safe", title: `${label} chưa bị báo cáo`, target: norm, score: 0,
    reasons: ["Chưa có trong cơ sở dữ liệu báo cáo.", "Nếu bị yêu cầu chuyển tiền gấp, hãy dừng lại và xác minh qua kênh khác."] };
}

// Hiển thị URL đã tách theo cấu trúc: tên miền phụ | tên miền chính | đuôi | đường dẫn.
function renderUrlParts(p) {
  const part = (cls, label, text) => (text ? `<span class="up ${cls}" title="${label}"><small>${label}</small>${esc(text)}</span>` : "");
  const parts = p.isIp
    ? part("up-dom", "địa chỉ IP", p.host)
    : part("up-sub", "tên miền phụ", p.sub) + part("up-dom", "tên miền chính", p.domLabel) + part("up-suf", "đuôi", p.suffix);
  const uni = p.hostUnicode !== p.host ? `<div class="small muted">Hiển thị thật: <b>${esc(p.hostUnicode)}</b></div>` : "";
  return `<div class="url-parts">${parts}${part("up-path", "đường dẫn", (p.path + p.query).slice(0, 80))}</div>${uni}`;
}

// Mỗi lý do là một thanh đóng góp (+ đẩy về lừa đảo, − đẩy về an toàn), giống biểu đồ SHAP.
function renderContributions(r) {
  if (!r.reasons.length)
    return `<p class="small" style="margin:10px 0 0">Không phát hiện đặc trưng bất thường nào. Kết quả không đảm bảo an toàn tuyệt đối – hãy kiểm tra kỹ trước khi nhập thông tin.</p>`;
  const max = Math.max(...r.reasons.map((x) => Math.abs(x.value)), 3);
  const rows = r.reasons.map((x) => {
    const w = (Math.abs(x.value) / max) * 100;
    const bar = `<i style="width:${w}%"></i>`;
    return `<div class="c-row ${x.value > 0 ? "pos" : "neg"}">
      <span class="c-text">${esc(x.text)} <small class="c-group">${esc(x.group)}</small></span>
      <span class="c-bar"><span class="c-left">${x.value < 0 ? bar : ""}</span><span class="c-right">${x.value > 0 ? bar : ""}</span></span>
      <b class="c-val">${x.value > 0 ? "+" : "−"}${Math.abs(x.value)}</b>
    </div>`;
  }).join("");
  return `<h4>Vì sao có kết quả này?</h4><div class="contrib">${rows}</div>
    <p class="small muted" style="margin:8px 0 0">Thanh đỏ đẩy về phía lừa đảo, thanh xanh đẩy về phía an toàn. F1: cấu trúc · F2: từ khoá theo vị trí · F4: giả mạo thương hiệu.</p>`;
}

// Vẽ kết quả kiểm tra vào box. type: url | phone | bank; value: chuỗi người dùng nhập.
function renderScanResult(box, r, type, value) {
  const icon = { danger: "⛔", warn: "⚠️", safe: "✅" }[r.level];
  const color = { danger: "var(--danger)", warn: "var(--warn)", safe: "var(--safe)" }[r.level];
  const reportHref = `bao-cao.html?kind=${type}&subject=${encodeURIComponent(value)}`;
  box.className = "result " + r.level;
  box.innerHTML = `
    <h3>${icon} ${esc(r.title)}</h3>
    ${r.parsed ? renderUrlParts(r.parsed) : r.target ? `<div class="muted small">Đối tượng: <b>${esc(r.target)}</b></div>` : ""}
    <div class="score-bar"><i style="width:${Math.max(r.score, 4)}%;background:${color}"></i></div>
    <div class="small muted">${r.parsed ? "Xác suất lừa đảo" : "Mức độ rủi ro"}: ${r.score}${r.parsed ? "%" : "/100"}</div>
    ${r.parsed ? renderContributions(r) : `<ul>${r.reasons.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`}
    ${r.level !== "danger" ? `<p class="small" style="margin:10px 0 0">Bạn nghi ngờ đối tượng này? <a href="${reportHref}">Gửi báo cáo →</a></p>` : ""}`;
  box.hidden = false;
}
