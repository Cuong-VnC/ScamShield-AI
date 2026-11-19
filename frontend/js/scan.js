// Kết luận do Backend cung cấp. Phân tích URL và báo cáo cá nhân chỉ bổ sung ngữ cảnh.

function analyzeUrl(input) {
  const analysis = UrlAnalyzer.analyze(input);
  if (!analysis.valid) return { ...analysis, level: "unknown", aiState: "invalid" };
  const parsed = analysis.parsed;
  if (!parsed.requestUrl) return { ...analysis, level: "unknown", aiState: "credentials" };

  const reports = getReports();
  const localReport = Array.isArray(reports) && reports.some((report) =>
    report?.type === "url" && UrlAnalyzer.parse(report.target)?.comparisonUrl === parsed.comparisonUrl
  );
  return { ...analysis, localReport, level: "unknown", aiState: "pending" };
}

function isProbability(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function mergeAiResult(r, ai) {
  const level = AiApi.verdictLevel(ai);
  if (!level) return { ...r, aiState: "fail", aiErrorCode: "invalid" };
  const score = ai.status !== "DomainNotFound" && isProbability(ai.probability)
    ? Math.round(ai.probability * 100) : null;
  return { ...r, ai, aiState: "ok", level, score };
}

async function analyzeUrlWithAi(input, onPartial) {
  const r = analyzeUrl(input);
  if (r.aiState !== "pending") return r;
  onPartial?.(r);
  try {
    return mergeAiResult(r, await AiApi.predict(r.parsed.requestUrl));
  } catch (e) {
    return { ...r, aiState: "fail", aiErrorCode: e.code,
      aiErrorStatus: e.status, aiErrorDetail: e.detail, aiBackendCode: e.backendCode,
      aiRequestId: e.requestId };
  }
}

// Các giá trị động phải được escape trước khi đưa vào template HTML.
const T = (key, vars) => esc(Language.t(key, vars));

function resultTitle(r) {
  if (r.aiState === "invalid") return Language.t("titleInvalid");
  if (r.aiState === "pending") return Language.t("titlePending");
  if (r.aiState === "fail") return Language.t("titleUnavailable");
  if (r.ai?.status === "DomainNotFound") return Language.t("titleNotFound");
  return Language.t({ danger: "titleDanger", safe: "titleSafe" }[r.level] || "titleUnknown");
}

function renderUrlParts(p) {
  const part = (cls, key, text) => text
    ? `<span class="up ${cls}" title="${T(key)}"><small>${T(key)}</small>${esc(text)}</span>` : "";
  const domain = p.isIp || !p.suffix
    ? part("up-dom", p.isIp ? "partIp" : "partHost", p.host)
    : part("up-sub", "partSub", p.sub) + part("up-dom", "partDom", p.domLabel) + part("up-suf", "partSuf", p.suffix);
  return `<div class="url-parts">${part("up-path", "partScheme", p.scheme)}${domain}${part("up-path", "partPath", (p.path + p.query).slice(0, 160))}</div>`;
}

function renderSignals(r) {
  const rows = r.reasons.map((signal) => `<li>${esc(Language.reason(signal, r.parsed))}</li>`).join("");
  const content = rows ? `<ul class="r-list signal-list">${rows}</ul>
    <p class="r-note">${T("scoreRules", { score: fmt(r.riskSignalScore) })}</p>` : `<p class="r-note">${T("noSignals")}</p>`;
  return `<section class="r-block"><h4>${T("urlSignals")}</h4><p class="r-note">${T("signalsReference")}</p>${content}</section>`;
}

function renderAiLine(r) {
  if (r.aiState === "pending")
    return `<div class="ai-line pending"><span class="spinner" aria-hidden="true"></span><span>${T("aiPending")}<br><small>${T("aiPendingHint")}</small></span></div>`;
  if (r.aiState === "credentials")
    return `<p class="di-warning">${ico("alert")}<span>${T("credentialsBlocked")}</span></p>`;
  if (r.aiState === "fail")
    return `<div class="ai-line fail">${ico("alert")}<span>${T("aiFail", { error: Language.aiError(r) })}</span>
      <button type="button" class="btn btn-ghost btn-xs" data-action="retry-ai">${ico("refresh")}<span>${T("aiRetry")}</span></button></div>`;
  if (r.aiState !== "ok") return "";
  const ai = r.ai;
  const chips = [`<span class="ai-chip">${ico("cpu")}${T("chipSource", { src: Language.source(ai.source) })}</span>`];
  if (typeof ai.risk_level === "string") chips.push(`<span class="ai-chip">${T("chipRisk", { risk: Language.risk(ai.risk_level) })}</span>`);
  const nn = ai.technical_report?.nn_probability;
  if (ai.source === "ai_analysis" && isProbability(nn))
    chips.push(`<span class="ai-chip" title="${T("chipNnTip")}">${T("chipNn", { p: (nn * 100).toLocaleString(Language.locale(), { maximumFractionDigits: 1 }) })}</span>`);
  return `<div class="ai-line ok">${chips.join("")}</div>`;
}

// ---------- Thông tin tên miền chi tiết (domain_info của backend) ----------
function renderDomainInfo(info) {
  if (!info || typeof info !== "object" || Array.isArray(info)) return "";
  const NF = Language.t("diNotFound");
  const displayable = (v) => (typeof v === "string" && v !== "") || Number.isFinite(v);
  const val = (v) => displayable(v) ? v : NF;
  const list = (a) => Array.isArray(a) ? val(a.filter(displayable).join(", ")) : NF;
  const date = (iso) => {
    if (typeof iso !== "string" || !iso) return NF;
    const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
    return isNaN(d) ? iso : d.toLocaleDateString(Language.locale());
  };
  const dns = info.dns || {}, whois = info.whois || {}, tls = info.tls || {}, http = info.http || {};
  const statuses = { active: "diActive", inactive: "diInactive", nonexistent: "diNonexistent" };
  const statusKey = typeof info.status === "string" && Object.hasOwn(statuses, info.status) ? statuses[info.status] : null;
  const ip = http.ip_info;
  const ipInfo = ip ? [[ip.city, ip.region, ip.country].filter(displayable).join(", "), ip.isp, ip.asn].filter(displayable).join(" — ") : "";
  const L = (k) => Language.t(k);
  const groups = [
    [L("diOverview"), [
      [L("diDomain"), val(info.domain)], [L("diHost"), val(info.host)], [L("diStatus"), statusKey ? L(statusKey) : NF],
    ]],
    ["WHOIS", [
      [L("diCreated"), date(whois.created)], [L("diExpires"), date(whois.expires)],
      [L("diUpdated"), date(whois.updated)], [L("diRegistrar"), val(whois.registrar)],
      [L("diAge"), Number.isFinite(whois.age_days) ? Language.t("diDays", { n: fmt(whois.age_days) }) : NF],
      [L("diNs"), list(whois.name_servers)],
    ]],
    [L("diTls"), [
      [L("diValid"), !tls.checked ? NF : tls.valid === true ? L("diValidYes") : tls.valid === false ? L("diValidNo") : NF],
      [L("diIssuer"), val(tls.issuer)], [L("diTlsExpires"), date(tls.expires)],
      [L("diValidity"), Number.isFinite(tls.days_left) ? (tls.days_left >= 0 ? Language.t("diDaysLeft", { n: tls.days_left }) : Language.t("diExpiredAgo", { n: -tls.days_left })) : NF],
      [L("diVersion"), val(tls.tls_version)],
    ]],
    ["HTTP", [
      [L("diReachable"), http.reachable === true ? L("diYes") : http.reachable === false ? Language.t("diUnreachable", { error: Language.probeError(http.error) }) : NF],
      [L("diStatusCode"), val(http.status_code)],
      [L("diFinalUrl"), val(http.final_url)],
      [L("diRedirects"), Array.isArray(http.redirects) && http.redirects.length ? http.redirects.filter(displayable).join(" → ") || NF : L("diNoRedirect")],
      [L("diServer"), val(http.server)],
      [L("diResponse"), Number.isFinite(http.response_time_ms) ? Language.t("diMs", { n: fmt(http.response_time_ms) }) : NF],
      [L("diIp"), val(http.resolved_ip)], [L("diGeo"), ipInfo || NF],
    ]],
    ["DNS", [
      ["A", list(dns.a)], ["AAAA", list(dns.aaaa)], ["MX", list(dns.mx)], ["NS", list(dns.ns)],
      ["SPF", val(dns.spf)], ["DMARC", dns.dmarc ? (typeof dns.dmarc.policy === "string" && dns.dmarc.policy ? `p=${dns.dmarc.policy}` : val(dns.dmarc.record)) : NF],
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

function renderScanResult(box, r, value) {
  const notFound = r.ai?.status === "DomainNotFound";
  const level = r.aiState === "ok" ? r.level : "unknown";
  const iconName = notFound ? "ban" : { danger: "octagon", unknown: "alert", safe: "shieldCheck" }[level];
  const kicker = { pending: "kickerPending", fail: "kickerFail", ok: "kickerOk" }[r.aiState] || "kickerPlain";
  const reportHref = r.parsed?.requestUrl
    ? `bao-cao.html?kind=url&subject=${encodeURIComponent(r.parsed.requestUrl)}` : "";
  const wasOpen = box.querySelector("details.di")?.open;
  const scoreLabel = r.ai?.source === "ai_analysis" ? "probAi" : "scoreBackend";
  const scoreBlock = r.aiState === "ok" && Number.isFinite(r.score) ? `
    <div class="r-score">
      <div class="r-score-head"><span>${T(scoreLabel)}</span><b class="mono">${r.score}%</b></div>
      <div class="score-bar" role="img" aria-label="${T(scoreLabel)}: ${r.score}%"><i style="width:${r.score}%"></i></div>
    </div>` : "";

  box.className = `result ${level}${r.aiState === "pending" ? " is-pending" : ""}${notFound ? " is-notfound" : ""}`;
  box.innerHTML = `
    <div class="r-head">
      <span class="r-icon">${ico(iconName)}</span>
      <div class="r-headings">
        <p class="r-kicker">${T(kicker)}</p>
        <h3 id="resultTitle">${esc(resultTitle(r))}</h3>
        <p class="r-target mono">${esc(r.parsed?.host || String(value).slice(0, 2048))}</p>
      </div>
    </div>
    ${r.parsed ? renderAiLine(r) : ""}
    ${typeof r.ai?.warning === "string" && r.ai.warning ? `<p class="di-warning">${ico("alert")}<span>${esc(Language.aiWarning(r.ai.warning))}</span></p>` : ""}
    ${notFound ? `<p class="r-message">${esc(Language.domainNotFound(r.ai, r.parsed?.host))}</p>` : ""}
    ${level === "safe" && r.hasRiskSignals ? `<p class="di-warning">${ico("alert")}<span>${T("signalsCaution")}</span></p>` : ""}
    ${r.localReport ? `<p class="r-note">${T("localReportReference")}</p>` : ""}
    ${r.parsed ? renderUrlParts(r.parsed) : ""}
    ${scoreBlock}
    ${r.parsed ? renderSignals(r) : `<ul class="r-list"><li>${T("invalidReason")}</li></ul>`}
    ${r.ai ? renderDomainInfo(r.ai.domain_info) : ""}
    ${reportHref && level !== "danger" ? `<p class="r-report">${T("reportPrompt")} <a href="${esc(reportHref)}">${T("reportLink")} ${ico("arrowRight")}</a></p>` : ""}`;
  if (wasOpen) box.querySelector("details.di")?.setAttribute("open", "");
  box.setAttribute("aria-labelledby", "resultTitle");
  box.hidden = false;
}
