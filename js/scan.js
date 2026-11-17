// Kiểm tra URL / số điện thoại / số tài khoản và hiển thị kết quả. Dùng ở trang chủ và trang tin nhắn.
//
// URL được phân tích theo hai lớp:
//   1. Bộ quy tắc trên trình duyệt (js/url-analyzer.js) – chạy tức thì, cho phần tách cấu trúc + "Vì sao".
//   2. Model AI ở backend (js/api.js → POST /predict) – đưa ra KẾT LUẬN và xác suất cuối cùng.
// Nếu backend lỗi / quá chậm, giữ kết quả của bộ quy tắc và ghi chú rõ cho người dùng.

const URL_TITLES = {
  danger: "NGUY HIỂM – Nhiều dấu hiệu lừa đảo",
  warn: "ĐÁNG NGỜ – Cần thận trọng",
  safe: "AN TOÀN – Chưa thấy dấu hiệu bất thường",
};

const AI_SOURCES = {
  whitelist: "Danh sách tin cậy của model",
  ai_analysis: "Model AI (CNN+BiLSTM → XGBoost)",
  database_blacklist: "Cơ sở dữ liệu đen",
  database_whitelist: "Cơ sở dữ liệu trắng",
  urlhaus_database: "URLhaus",
  google_safe_browsing: "Google Safe Browsing",
  domain_check: "Kiểm tra tên miền",
};

// Ngưỡng hiển thị "đáng ngờ" khi model nói Safe nhưng xác suất vẫn khá cao (giống frontend gốc của backend).
const AI_WARN_PROB = 0.4;

// Gọi bộ phân tích URL (js/url-analyzer.js), kèm danh sách đen + báo cáo cộng đồng.
function analyzeUrl(input) {
  const reported = getReports().filter((r) => r.type === "url").map((r) => UrlAnalyzer.parse(r.target)?.host).filter(Boolean);
  const r = UrlAnalyzer.analyze(input, { blacklist: [...BLACKLIST.url, ...reported] });
  if (!r.valid) return { level: "warn", title: "Đường link không hợp lệ", target: input, score: 50, reasons: ["Vui lòng kiểm tra lại định dạng, ví dụ: tenmien.vn/duong-dan."] };
  return { ...r, target: r.parsed.host, title: URL_TITLES[r.level] };
}

// Ghép kết quả model AI vào kết quả của bộ quy tắc: AI quyết định mức độ + xác suất,
// bộ quy tắc vẫn cung cấp phần tách cấu trúc và lý do.
function mergeAiResult(r, ai) {
  const status = String(ai.status || "");
  const prob = Number(ai.probability);
  const hasProb = ai.probability !== null && ai.probability !== undefined && Number.isFinite(prob);
  const out = { ...r, ai, aiState: "ok", ruleLevel: r.level, ruleScore: r.score };

  if (status === "DomainNotFound") {
    return { ...out, level: "warn", score: null, title: "TÊN MIỀN KHÔNG TỒN TẠI – Không truy cập được",
      aiMessage: ai.message || "Tên miền này không phân giải được trên Internet – có thể đã bị xoá hoặc chưa từng được đăng ký." };
  }
  let level;
  if (status.includes("Phishing")) level = "danger";
  else if (status === "Safe") level = hasProb && prob >= AI_WARN_PROB ? "warn" : "safe";
  else level = "warn"; // trạng thái lạ: không bao giờ mặc định an toàn

  // Báo cáo cộng đồng / danh sách đen cục bộ luôn được ưu tiên.
  const blacklisted = (r.reasons || []).some((x) => x.id === "blacklisted");
  if (blacklisted) level = "danger";

  // Thanh xác suất luôn là của model; mức "nguy hiểm" do danh sách đen đã thể hiện qua level + lý do.
  const score = hasProb ? Math.round(prob * 100) : r.score;
  return { ...out, level, score, title: URL_TITLES[level] };
}

// Phân tích URL đầy đủ: trả kết quả bộ quy tắc ngay qua onPartial, rồi kết quả cuối (có AI) qua Promise.
async function analyzeUrlWithAi(input, onPartial) {
  const r = analyzeUrl(input);
  if (!r.parsed) return r; // link sai định dạng: không cần hỏi model
  onPartial?.({ ...r, aiState: "pending" });
  try {
    return mergeAiResult(r, await AiApi.predict(input));
  } catch (e) {
    return { ...r, aiState: "fail", aiError: e.message };
  }
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
  const fromAi = r.aiState === "ok";
  const heading = fromAi ? "Dấu hiệu nhận thấy trong đường link" : "Vì sao có kết quả này?";
  if (!r.reasons.length)
    return `<h4>${heading}</h4><p class="small" style="margin:6px 0 0">Bộ quy tắc không phát hiện đặc trưng bất thường nào. Kết quả không đảm bảo an toàn tuyệt đối – hãy kiểm tra kỹ trước khi nhập thông tin.</p>`;
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
  const note = fromAi
    ? `Phần giải thích do bộ quy tắc trên trình duyệt đưa ra (bộ quy tắc tự chấm: ${r.ruleScore}%); kết luận phía trên là của model AI.`
    : "Thanh đỏ đẩy về phía lừa đảo, thanh xanh đẩy về phía an toàn.";
  return `<h4>${heading}</h4><div class="contrib">${rows}</div>
    <p class="small muted" style="margin:8px 0 0">${note} F1: cấu trúc · F2: từ khoá theo vị trí · F4: giả mạo thương hiệu.</p>`;
}

// Dòng trạng thái model AI ngay dưới tiêu đề kết quả.
function renderAiLine(r) {
  if (r.aiState === "pending")
    return `<p class="ai-line pending"><span class="spinner"></span>Đang hỏi model AI… Tạm hiện kết quả của bộ quy tắc trên trình duyệt.</p>`;
  if (r.aiState === "fail")
    return `<p class="ai-line fail">⚠️ Chưa dùng được model AI (${esc(r.aiError || "lỗi không xác định")}). Kết quả dưới đây chỉ từ bộ quy tắc trên trình duyệt.</p>`;
  if (r.aiState !== "ok") return "";
  const ai = r.ai;
  const tr = ai.technical_report || {};
  const chips = [`<span class="ai-chip">🤖 Nguồn: ${esc(AI_SOURCES[ai.source] || ai.source || "Không rõ")}</span>`];
  if (ai.risk_level) chips.push(`<span class="ai-chip">Mức rủi ro: ${esc(ai.risk_level)}</span>`);
  if (tr.nn_probability !== undefined && tr.nn_probability !== null)
    chips.push(`<span class="ai-chip" title="Xác suất của riêng mạng nơ-ron trước khi xếp chồng XGBoost">NN: ${(Number(tr.nn_probability) * 100).toFixed(1)}%</span>`);
  if (r.ruleLevel && r.ruleLevel !== r.level && r.score !== null)
    chips.push(`<span class="ai-chip muted-chip" title="Bộ quy tắc trên trình duyệt cho kết quả khác model AI">Bộ quy tắc: ${r.ruleScore}%</span>`);
  return `<div class="ai-line ok">${chips.join("")}</div>`;
}

// ---------- Thông tin tên miền chi tiết (domain_info của backend) ----------
const DI_NF = "Không tìm thấy";
const diVal = (v) => (v === null || v === undefined || v === "" ? DI_NF : v);
const diList = (a) => (a && a.length ? a.join(", ") : DI_NF);
function diDate(iso) {
  if (!iso) return DI_NF;
  const d = new Date(iso + (String(iso).length === 10 ? "T00:00:00" : ""));
  return isNaN(d) ? iso : d.toLocaleDateString("vi-VN");
}

function renderDomainInfo(info) {
  if (!info) return "";
  const dns = info.dns || {}, whois = info.whois || {}, tls = info.tls || {}, http = info.http || {};
  const status = { active: "Đang hoạt động", inactive: "Không hoạt động", nonexistent: "Không tồn tại" }[info.status] || DI_NF;
  const ip = http.ip_info;
  const ipInfo = ip ? [[ip.city, ip.region, ip.country].filter(Boolean).join(", "), ip.isp, ip.asn].filter(Boolean).join(" — ") : "";
  const groups = [
    ["Tổng quan", [
      ["Tên miền", diVal(info.domain)], ["Máy chủ (host)", diVal(info.host)], ["Trạng thái", status],
    ]],
    ["WHOIS", [
      ["Ngày đăng ký", diDate(whois.created)], ["Ngày hết hạn", diDate(whois.expires)],
      ["Cập nhật", diDate(whois.updated)], ["Nhà đăng ký", diVal(whois.registrar)],
      ["Tuổi tên miền", whois.age_days !== null && whois.age_days !== undefined ? `${fmt(whois.age_days)} ngày` : DI_NF],
      ["Name server", diList(whois.name_servers)],
    ]],
    ["Chứng chỉ TLS", [
      ["Hợp lệ", !tls.checked ? DI_NF : tls.valid === true ? "Hợp lệ" : tls.valid === false ? "Không hợp lệ" : DI_NF],
      ["Tổ chức cấp", diVal(tls.issuer)], ["Hết hạn", diDate(tls.expires)],
      ["Thời hạn", tls.days_left !== null && tls.days_left !== undefined ? (tls.days_left >= 0 ? `Còn ${tls.days_left} ngày` : `Hết hạn ${-tls.days_left} ngày trước`) : DI_NF],
      ["Phiên bản", diVal(tls.tls_version)],
    ]],
    ["HTTP", [
      ["Truy cập được", http.reachable === true ? "Có" : http.reachable === false ? `Không (${http.error || "lỗi kết nối"})` : DI_NF],
      ["Mã trạng thái", http.status_code !== null && http.status_code !== undefined ? String(http.status_code) : DI_NF],
      ["URL cuối cùng", diVal(http.final_url)],
      ["Chuyển hướng", http.redirects && http.redirects.length ? http.redirects.join(" → ") : "Không có"],
      ["Máy chủ web", diVal(http.server)],
      ["Thời gian phản hồi", http.response_time_ms !== null && http.response_time_ms !== undefined ? `${fmt(http.response_time_ms)} ms` : DI_NF],
      ["Địa chỉ IP", diVal(http.resolved_ip)], ["Vị trí / nhà mạng", ipInfo || DI_NF],
    ]],
    ["DNS", [
      ["A", diList(dns.a)], ["AAAA", diList(dns.aaaa)], ["MX", diList(dns.mx)], ["NS", diList(dns.ns)],
      ["SPF", diVal(dns.spf)], ["DMARC", dns.dmarc ? (dns.dmarc.policy ? `p=${dns.dmarc.policy}` : diVal(dns.dmarc.record)) : DI_NF],
      ["DNSSEC", dns.dnssec ? (dns.dnssec.enabled ? "Có" : "Không") : DI_NF],
    ]],
  ];
  const body = groups.map(([title, rows]) => `
    <div class="di-group">
      <h5 class="mono">${title}</h5>
      <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd class="${v === DI_NF ? "nf" : ""}">${esc(v)}</dd>`).join("")}</dl>
    </div>`).join("");
  return `<details class="di"><summary>🌐 Thông tin tên miền chi tiết <small class="muted">DNS · WHOIS · TLS · HTTP</small></summary><div class="di-body">${body}</div></details>`;
}

// Vẽ kết quả kiểm tra vào box. type: url | phone | bank; value: chuỗi người dùng nhập.
function renderScanResult(box, r, type, value) {
  const icon = r.ai?.status === "DomainNotFound" ? "🚫" : { danger: "⛔", warn: "⚠️", safe: "✅" }[r.level];
  const color = { danger: "var(--danger)", warn: "var(--warn)", safe: "var(--safe)" }[r.level];
  const reportHref = `bao-cao.html?kind=${type}&subject=${encodeURIComponent(value)}`;
  const hasScore = r.score !== null && r.score !== undefined;
  box.className = "result " + r.level + (r.aiState === "pending" ? " is-pending" : "");
  box.innerHTML = `
    <h3>${icon} ${esc(r.title)}</h3>
    ${r.parsed ? renderAiLine(r) : ""}
    ${r.ai?.warning ? `<p class="di-warning">⚠️ ${esc(r.ai.warning)}</p>` : ""}
    ${r.aiMessage ? `<p class="small" style="margin:8px 0 0">${esc(r.aiMessage)}</p>` : ""}
    ${r.parsed ? renderUrlParts(r.parsed) : r.target ? `<div class="muted small">Đối tượng: <b>${esc(r.target)}</b></div>` : ""}
    ${hasScore ? `<div class="score-bar"><i style="width:${Math.max(r.score, 4)}%;background:${color}"></i></div>
    <div class="small muted">${r.parsed ? (r.aiState === "ok" ? "Xác suất lừa đảo (model AI)" : "Xác suất lừa đảo (bộ quy tắc)") : "Mức độ rủi ro"}: ${r.score}${r.parsed ? "%" : "/100"}</div>` : ""}
    ${r.parsed ? renderContributions(r) : `<ul>${r.reasons.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`}
    ${r.ai ? renderDomainInfo(r.ai.domain_info) : ""}
    ${r.level !== "danger" ? `<p class="small" style="margin:10px 0 0">Bạn nghi ngờ đối tượng này? <a href="${reportHref}">Gửi báo cáo →</a></p>` : ""}`;
  box.hidden = false;
}
