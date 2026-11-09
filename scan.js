/* ============================================================================
   HIỂN THỊ BÁO CÁO KẾT QUẢ QUÉT URL
   ----------------------------------------------------------------------------
   Dựa trên scan.js gốc của nhóm:
     - Giữ nguyên UrlAnalyzer.analyze() và ngưỡng đánh giá nguy cơ.
     - Giữ danh sách đen URL mẫu, biểu đồ điểm, cấu trúc URL và thanh F1/F2/F4.
     - Đã bỏ quét số điện thoại, số tài khoản và link gửi báo cáo cộng đồng.
     - Nội dung động được dịch theo ngôn ngữ đang chọn.
   Lưu ý: không gửi URL lên server; mọi phân tích chạy ngay trên trình duyệt.
   ============================================================================ */

// Giữ bộ phân tích URL gốc, chỉ còn đối chiếu với danh sách mẫu.
// Chức năng getReports()/các báo cáo tự nhập đã bị xóa cùng trang báo cáo.
function analyzeUrl(input) {
  const result = UrlAnalyzer.analyze(input, { blacklist: BLACKLIST.url });
  if (!result.valid) return {
    valid: false, level: 'warn', score: 50, target: input,
    reasons: [Language.t('invalidReason')],
  };
  return { ...result, target: result.parsed.host };
}

// Tách URL thành các nhãn màu: subdomain, domain chính, suffix và path.
// Cấu trúc HTML và các class vẫn dùng nguyên CSS trong frontend gốc.
function renderUrlParts(parsed) {
  const part = (className, label, value) => value
    ? `<span class="up ${className}" title="${esc(label)}"><small>${esc(label)}</small>${esc(value)}</span>`
    : '';
  const parts = parsed.isIp
    ? part('up-dom', Language.t('ip'), parsed.host)
    : part('up-sub', Language.t('subdomain'), parsed.sub)
      + part('up-dom', Language.t('mainDomain'), parsed.domLabel)
      + part('up-suf', Language.t('suffix'), parsed.suffix);
  const unicode = parsed.hostUnicode !== parsed.host
    ? `<div class="small muted">${Language.t('realDisplay')}: <b>${esc(parsed.hostUnicode)}</b></div>`
    : '';
  return `<div class="url-parts">${parts}${part('up-path', Language.t('path'), (parsed.path + parsed.query).slice(0, 80))}</div>${unicode}`;
}

// Biểu đồ đóng góp F1/F2/F4: trị số dương đẩy mức rủi ro lên,
// trị số âm kéo xuống. KHÔNG thay đổi trị số hoặc thứ tự so với engine.
function renderContributions(result) {
  if (!result.reasons.length) {
    return `<p class="small" style="margin:10px 0 0">${esc(Language.t('noSignals'))}</p>`;
  }
  const max = Math.max(...result.reasons.map(item => Math.abs(item.value)), 3);
  const rows = result.reasons.map(item => {
    const width = (Math.abs(item.value) / max) * 100;
    const bar = `<i style="width:${width}%"></i>`;
    const translatedReason = Language.reason(item, result.parsed);
    const translatedGroup = Language.group(item.group);
    return `<div class="c-row ${item.value > 0 ? 'pos' : 'neg'}">
      <span class="c-text">${esc(translatedReason)} <small class="c-group">${esc(translatedGroup)}</small></span>
      <span class="c-bar"><span class="c-left">${item.value < 0 ? bar : ''}</span><span class="c-right">${item.value > 0 ? bar : ''}</span></span>
      <b class="c-val">${item.value > 0 ? '+' : '−'}${Math.abs(item.value)}</b>
    </div>`;
  }).join('');
  return `<h4>${esc(Language.t('whyTitle'))}</h4><div class="contrib">${rows}</div>
    <p class="small muted" style="margin:8px 0 0">${esc(Language.t('contributionsLegend'))}</p>`;
}

// Vẽ báo cáo vào phần tử #checkResult.
// Hàm được gọi cả khi quét URL và khi người dùng đổi ngôn ngữ.
function renderScanResult(box, result, value) {
  const icon = { danger: '⛔', warn: '⚠️', safe: '✅' }[result.level];
  const color = { danger: 'var(--danger)', warn: 'var(--warn)', safe: 'var(--safe)' }[result.level];
  const title = result.valid === false ? Language.t('invalidTitle') : Language.t(`${result.level}Title`);
  box.className = 'result ' + result.level;
  box.innerHTML = `
    <h3>${icon} ${esc(title)}</h3>
    ${result.parsed
      ? renderUrlParts(result.parsed)
      : `<div class="muted small">${esc(Language.t('targetLabel'))}: <b>${esc(value)}</b></div>`}
    <div class="score-bar"><i style="width:${Math.max(0, Math.min(result.score, 100))}%;background:${color}"></i></div>
    <div class="small muted">${esc(Language.t('scoreLabel'))}: ${result.score}/100</div>
    ${result.parsed
      ? renderContributions(result)
      : `<ul><li>${esc(Language.t('invalidReason'))}</li></ul>`}
    <p class="small muted result-note">${esc(Language.t('resultDisclaimer'))}</p>`;
  box.hidden = false;
}
