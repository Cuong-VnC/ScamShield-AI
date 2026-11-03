// Trang tin nhắn: phân tích nội dung đáng ngờ bằng bộ quy tắc (TEXT_RULES trong data.js).
// Khi có backend, chỉ cần thay analyzeMessage() bằng lời gọi API trả về cùng cấu trúc
// { verdict, risk_score, scam_type, summary, red_flags, advice }.
const stripVi = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

function analyzeMessage(text) {
  const norm = stripVi(text);
  const flags = [];
  const typeScore = {};
  let score = 0;

  TEXT_RULES.forEach((r) => {
    if (!r.re.test(norm)) return;
    score += r.w;
    flags.push(r.flag);
    if (r.type) typeScore[r.type] = (typeScore[r.type] || 0) + r.w;
  });

  // Kiểm tra các đường link trong tin nhắn bằng bộ phân tích URL.
  const links = text.match(/(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?/gi) || [];
  links.forEach((l) => {
    const r = analyzeUrl(l);
    if (r.level === "danger") {
      score += 35;
      flags.push(`Đường link nguy hiểm: ${r.target}.`);
      typeScore["Giả mạo ngân hàng"] = (typeScore["Giả mạo ngân hàng"] || 0) + 10;
    } else if (r.level === "warn") {
      score += 15;
      flags.push(`Đường link đáng ngờ: ${r.target}.`);
    }
  });

  const risk_score = Math.min(score, 99);
  const scam_type = Object.entries(typeScore).sort((a, b) => b[1] - a[1])[0]?.[0] || "Không xác định";
  const advice = [...(TYPE_ADVICE[scam_type] || []), "Không chuyển tiền khi chưa xác minh qua kênh chính thức.", "Nếu đã lỡ làm theo, xem trang “Bị lừa?” để biết cần làm gì ngay."];
  const base = { risk_score, scam_type, red_flags: flags };

  if (norm.replace(/\s/g, "").length < 15)
    return { ...base, verdict: "khong_du_thong_tin", summary: "Nội dung quá ngắn để đánh giá. Hãy dán đầy đủ tin nhắn.", advice: [] };
  if (risk_score >= 50)
    return { ...base, verdict: "lua_dao", summary: `Nội dung có nhiều dấu hiệu của thủ đoạn “${scam_type}”. Rất có khả năng đây là lừa đảo.`, advice };
  if (risk_score >= 20)
    return { ...base, verdict: "dang_ngo", summary: "Nội dung có một số dấu hiệu đáng ngờ. Hãy xác minh kỹ trước khi làm theo.", advice };
  return { ...base, verdict: "an_toan", scam_type: "Không xác định", summary: "Chưa phát hiện dấu hiệu lừa đảo rõ ràng. Tuy vậy, vẫn nên cảnh giác nếu bị yêu cầu chuyển tiền hoặc cung cấp thông tin.", advice: [] };
}

const VERDICT = {
  lua_dao: { cls: "danger", icon: "⛔", label: "LỪA ĐẢO" },
  dang_ngo: { cls: "warn", icon: "⚠️", label: "ĐÁNG NGỜ" },
  an_toan: { cls: "safe", icon: "✅", label: "Chưa thấy dấu hiệu lừa đảo" },
  khong_du_thong_tin: { cls: "warn", icon: "❔", label: "Chưa đủ thông tin" },
};

function renderMessageResult(data) {
  const v = VERDICT[data.verdict];
  const color = { danger: "var(--danger)", warn: "var(--warn)", safe: "var(--safe)" }[v.cls];
  const list = (arr) => arr.map((x) => `<li>${esc(x)}</li>`).join("");
  const box = $("#aiResult");
  box.className = "result " + v.cls;
  box.innerHTML = `
    <h3>${v.icon} ${v.label}</h3>
    <div class="muted small">Thủ đoạn: <b>${esc(data.scam_type)}</b></div>
    <div class="score-bar"><i style="width:${Math.max(data.risk_score, 4)}%;background:${color}"></i></div>
    <div class="small muted">Mức độ rủi ro: ${data.risk_score}/100</div>
    <p style="margin:10px 0 0">${esc(data.summary)}</p>
    ${data.red_flags.length ? `<h4>🚩 Dấu hiệu</h4><ul>${list(data.red_flags)}</ul>` : ""}
    ${data.advice.length ? `<h4>🛡️ Bạn nên làm gì</h4><ul>${list(data.advice)}</ul>` : ""}`;
  box.hidden = false;
}

$("#aiForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = $("#aiText").value.trim();
  if (!text) { $("#aiText").focus(); return; }
  const btn = $("#aiSubmit");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Đang phân tích…';
  setTimeout(() => {
    renderMessageResult(analyzeMessage(text));
    btn.disabled = false;
    btn.textContent = "Phân tích tin nhắn";
  }, 600);
});

// Tin nhắn mẫu để thử nhanh.
$$(".sample").forEach((b) => b.addEventListener("click", () => {
  $("#aiText").value = b.dataset.text;
  $("#aiForm").requestSubmit();
}));
