// Kiểm tra URL và hiển thị kết quả (trang chủ).
//
// URL được phân tích theo hai lớp:
//   1. Bộ quy tắc trên trình duyệt (js/url-analyzer.js) – chạy tức thì, cho phần tách cấu trúc + "Vì sao".
//   2. Model AI ở backend (js/api.js → POST /predict) – đưa ra KẾT LUẬN và xác suất cuối cùng.
// Nếu backend lỗi / quá chậm, giữ kết quả của bộ quy tắc và ghi chú rõ cho người dùng.
//
// [redesign] analyzeUrl / mergeAiResult / analyzeUrlWithAi giữ nguyên logic của ScamShield-AI-fe
// (ngưỡng, ưu tiên danh sách đen, nguồn xác suất). Phần hiển thị được làm lại và dịch VI/EN qua Language;
// các trường title tiếng Việt trong dữ liệu vẫn giữ để tương thích. Đã bỏ analyzeNumber (quét SĐT/STK).

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
    // [redesign] lưu thêm mã lỗi để hiển thị VI/EN; aiError giữ thông điệp gốc.
    return { ...r, aiState: "fail", aiError: e.message, aiErrorCode: e.code, aiErrorStatus: e.status, aiErrorDetail: e.detail };
  }
}

// ======================================================================
// Hiển thị (dịch theo Language, chỉ dùng dữ liệu đã escape)
// ======================================================================
const T = (key, vars) => esc(Language.t(key, vars));

// Tiêu đề kết quả theo trạng thái — tương ứng URL_TITLES và các tiêu đề trong mergeAiResult / analyzeUrl.
function resultTitle(r) {
  if (!r.parsed) return Language.t("titleInvalid");
  if (r.ai?.status === "DomainNotFound") return Language.t("titleNotFound");
  return Language.t({ danger: "titleDanger", warn: "titleWarn", safe: "titleSafe" }[r.level]);
}

// Hiển thị URL đã tách theo cấu trúc: tên miền phụ | tên miền chính | đuôi | đường dẫn.
function renderUrlParts(p) {
  const part = (cls, key, text) => (text ? `<span class="up ${cls}" title="${T(key)}"><small>${T(key)}</small>${esc(text)}</span>` : "");
  const parts = p.isIp
    ? part("up-dom", "partIp", p.host)
    : part("up-sub", "partSub", p.sub) + part("up-dom", "partDom", p.domLabel) + part("up-suf", "partSuf", p.suffix);
  const uni = p.hostUnicode !== p.host ? `<p class="up-unicode">${T("realDisplay")}: <b>${esc(p.hostUnicode)}</b></p>` : "";
  return `<div class="url-parts">${parts}${part("up-path", "partPath", (p.path + p.query).slice(0, 80))}</div>${uni}`;
}

// Mỗi lý do là một thanh đóng góp (+ đẩy về lừa đảo, − đẩy về an toàn), giống biểu đồ SHAP.
function renderContributions(r) {
  const fromAi = r.aiState === "ok";
  const heading = T(fromAi ? "whyAi" : "whyRules");
  if (!r.reasons.length)
    return `<section class="r-block"><h4>${heading}</h4><p class="r-note">${T("noSignals")}</p></section>`;
  const max = Math.max(...r.reasons.map((x) => Math.abs(x.value)), 3);
  const rows = r.reasons.map((x) => {
    const w = (Math.abs(x.value) / max) * 100;
    const bar = `<i style="width:${w}%"></i>`;
    return `<div class="c-row ${x.value > 0 ? "pos" : "neg"}">
      <span class="c-text">${esc(Language.reason(x, r.parsed))} <small class="c-group">${esc(Language.group(x.group))}</small></span>
      <span class="c-bar" aria-hidden="true"><span class="c-left">${x.value < 0 ? bar : ""}</span><span class="c-right">${x.value > 0 ? bar : ""}</span></span>
      <b class="c-val">${x.value > 0 ? "+" : "−"}${Math.abs(x.value)}</b>
    </div>`;
  }).join("");
  const note = fromAi ? T("contribNoteAi", { score: r.ruleScore }) : T("contribNoteRules");
  return `<section class="r-block"><h4>${heading}</h4><div class="contrib">${rows}</div>
    <p class="r-note">${note} ${T("contribLegend")}</p></section>`;
}

// Dòng trạng thái model AI ngay dưới tiêu đề kết quả.
function renderAiLine(r) {
  if (r.aiState === "pending")
    return `<div class="ai-line pending"><span class="spinner" aria-hidden="true"></span><span>${T("aiPending")}<br><small>${T("aiPendingHint")}</small></span></div>`;
  if (r.aiState === "fail")
    return `<div class="ai-line fail">${ico("alert")}<span>${T("aiFail", { error: Language.aiError(r) })}</span>
      <button type="button" class="btn btn-ghost btn-xs" data-action="retry-ai">${ico("refresh")}<span>${T("aiRetry")}</span></button></div>`;
  if (r.aiState !== "ok") return "";
  const ai = r.ai;
  const tr = ai.technical_report || {};
  const chips = [`<span class="ai-chip">${ico("cpu")}${T("chipSource", { src: Language.source(ai.source) })}</span>`];
  if (ai.risk_level) chips.push(`<span class="ai-chip" title="risk_level: ${esc(ai.risk_level)}">${T("chipRisk", { risk: Language.risk(ai.risk_level) })}</span>`);
  if (tr.nn_probability !== undefined && tr.nn_probability !== null)
    chips.push(`<span class="ai-chip" title="${T("chipNnTip")}">${T("chipNn", { p: (Number(tr.nn_probability) * 100).toFixed(1) })}</span>`);
  if (r.ruleLevel && r.ruleLevel !== r.level && r.score !== null)
    chips.push(`<span class="ai-chip muted-chip" title="${T("chipRulesTip")}">${T("chipRules", { score: r.ruleScore })}</span>`);
  return `<div class="ai-line ok">${chips.join("")}</div>`;
}

// ---------- Thông tin tên miền chi tiết (domain_info của backend) ----------
function renderDomainInfo(info) {
  if (!info) return "";
  const NF = Language.t("diNotFound");
  const val = (v) => (v === null || v === undefined || v === "" ? NF : v);
  const list = (a) => (a && a.length ? a.join(", ") : NF);
  const has = (v) => v !== null && v !== undefined;
  const date = (iso) => {
    if (!iso) return NF;
    const d = new Date(iso + (String(iso).length === 10 ? "T00:00:00" : ""));
    return isNaN(d) ? iso : d.toLocaleDateString(Language.locale());
  };
  const dns = info.dns || {}, whois = info.whois || {}, tls = info.tls || {}, http = info.http || {};
  const statusKey = { active: "diActive", inactive: "diInactive", nonexistent: "diNonexistent" }[info.status];
  const ip = http.ip_info;
  const ipInfo = ip ? [[ip.city, ip.region, ip.country].filter(Boolean).join(", "), ip.isp, ip.asn].filter(Boolean).join(" — ") : "";
  const L = (k) => Language.t(k);
  const groups = [
    [L("diOverview"), [
      [L("diDomain"), val(info.domain)], [L("diHost"), val(info.host)], [L("diStatus"), statusKey ? L(statusKey) : NF],
    ]],
    ["WHOIS", [
      [L("diCreated"), date(whois.created)], [L("diExpires"), date(whois.expires)],
      [L("diUpdated"), date(whois.updated)], [L("diRegistrar"), val(whois.registrar)],
      [L("diAge"), has(whois.age_days) ? Language.t("diDays", { n: fmt(whois.age_days) }) : NF],
      [L("diNs"), list(whois.name_servers)],
    ]],
    [L("diTls"), [
      [L("diValid"), !tls.checked ? NF : tls.valid === true ? L("diValidYes") : tls.valid === false ? L("diValidNo") : NF],
      [L("diIssuer"), val(tls.issuer)], [L("diTlsExpires"), date(tls.expires)],
      [L("diValidity"), has(tls.days_left) ? (tls.days_left >= 0 ? Language.t("diDaysLeft", { n: tls.days_left }) : Language.t("diExpiredAgo", { n: -tls.days_left })) : NF],
      [L("diVersion"), val(tls.tls_version)],
    ]],
    ["HTTP", [
      [L("diReachable"), http.reachable === true ? L("diYes") : http.reachable === false ? Language.t("diUnreachable", { error: http.error || L("diConnError") }) : NF],
      [L("diStatusCode"), has(http.status_code) ? String(http.status_code) : NF],
      [L("diFinalUrl"), val(http.final_url)],
      [L("diRedirects"), http.redirects && http.redirects.length ? http.redirects.join(" → ") : L("diNoRedirect")],
      [L("diServer"), val(http.server)],
      [L("diResponse"), has(http.response_time_ms) ? Language.t("diMs", { n: fmt(http.response_time_ms) }) : NF],
      [L("diIp"), val(http.resolved_ip)], [L("diGeo"), ipInfo || NF],
    ]],
    ["DNS", [
      ["A", list(dns.a)], ["AAAA", list(dns.aaaa)], ["MX", list(dns.mx)], ["NS", list(dns.ns)],
      ["SPF", val(dns.spf)], ["DMARC", dns.dmarc ? (dns.dmarc.policy ? `p=${dns.dmarc.policy}` : val(dns.dmarc.record)) : NF],
      ["DNSSEC", dns.dnssec ? (dns.dnssec.enabled ? L("diYes") : L("diNo")) : NF],
    ]],
  ];
  const body = groups.map(([title, rows]) => `
    <div class="di-group">
      <h5>${esc(title)}</h5>
      <dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd class="${v === NF ? "nf" : ""}">${esc(v)}</dd>`).join("")}</dl>
    </div>`).join("");
  return `<details class="di"><summary>${ico("globe")}<span>${T("diSummary")}</span> <small>DNS · WHOIS · TLS · HTTP</small></summary><div class="di-body">${body}</div></details>`;
}

// Vẽ kết quả kiểm tra vào box. type giữ để tương thích (luôn là "url"); value: chuỗi người dùng nhập.
function renderScanResult(box, r, type, value) {
  const notFound = r.ai?.status === "DomainNotFound";
  const iconName = notFound ? "ban" : { danger: "octagon", warn: "alert", safe: "shieldCheck" }[r.level];
  const kicker = !r.parsed ? "kickerPlain" : { pending: "kickerPending", fail: "kickerFail", ok: "kickerOk" }[r.aiState] || "kickerPlain";
  const reportHref = `bao-cao.html?kind=${encodeURIComponent(type || "url")}&subject=${encodeURIComponent(value)}`;
  const hasScore = r.score !== null && r.score !== undefined;
  const fromAi = r.aiState === "ok";
  const wasOpen = box.querySelector("details.di")?.open; // giữ trạng thái mở khi vẽ lại (đổi ngôn ngữ)

  const scoreBlock = hasScore && r.parsed ? `
    <div class="r-score ${fromAi ? "is-ai" : "is-rules"}">
      <div class="r-score-head">
        <span>${T(fromAi ? "probAi" : "scoreRules")}</span>
        <b class="mono">${fromAi ? `${r.score}%` : `${r.score}/100`}</b>
      </div>
      <div class="score-bar" role="img" aria-label="${T(fromAi ? "probAi" : "scoreRules")}: ${fromAi ? `${r.score}%` : `${r.score}/100`}"><i style="width:${Math.max(r.score, 4)}%"></i></div>
    </div>` : "";

  box.className = `result ${r.level}${r.aiState === "pending" ? " is-pending" : ""}${notFound ? " is-notfound" : ""}`;
  box.innerHTML = `
    <div class="r-head">
      <span class="r-icon">${ico(iconName)}</span>
      <div class="r-headings">
        <p class="r-kicker">${T(kicker)}</p>
        <h3 id="resultTitle">${esc(resultTitle(r))}</h3>
        ${r.parsed ? `<p class="r-target mono">${esc(r.parsed.hostUnicode || r.target)}</p>` : `<p class="r-target">${T("targetLabel")}: <b class="mono">${esc(r.target ?? value)}</b></p>`}
      </div>
    </div>
    ${r.parsed ? renderAiLine(r) : ""}
    ${r.ai?.warning ? `<p class="di-warning">${ico("alert")}<span>${esc(Language.aiWarning(r.ai.warning))}</span></p>` : ""}
    ${notFound ? `<p class="r-message">${esc(Language.domainNotFound(r.ai, r.parsed?.host))}</p>` : ""}
    ${r.parsed ? renderUrlParts(r.parsed) : ""}
    ${scoreBlock}
    ${r.parsed ? renderContributions(r) : `<ul class="r-list"><li>${T("invalidReason")}</li></ul>`}
    ${r.ai ? renderDomainInfo(r.ai.domain_info) : ""}
    ${r.parsed && r.level !== "danger" ? `<p class="r-report">${T("reportPrompt")} <a href="${reportHref}">${T("reportLink")} ${ico("arrowRight")}</a></p>` : ""}`;
  if (wasOpen) box.querySelector("details.di")?.setAttribute("open", "");
  box.setAttribute("aria-labelledby", "resultTitle");
  box.hidden = false;
}
