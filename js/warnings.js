// Trang cảnh báo: tin cảnh báo (lọc theo chủ đề) + các thủ đoạn phổ biến.

const levelLabel = { high: "Nguy hiểm cao", mid: "Cảnh báo", info: "Lưu ý" };
const cats = ["Tất cả", ...new Set(NEWS.map((n) => n.cat))];
let activeCat = "Tất cả";

function renderNews() {
  $("#newsFilters").innerHTML = cats.map((c) => `<button class="chip ${c === activeCat ? "active" : ""}" data-cat="${c}">${c}</button>`).join("");
  $$("#newsFilters .chip").forEach((b) => b.addEventListener("click", () => { activeCat = b.dataset.cat; renderNews(); }));
  const list = NEWS.filter((n) => activeCat === "Tất cả" || n.cat === activeCat);
  $("#newsGrid").innerHTML = list.map((n) => `
    <article class="card" data-i="${NEWS.indexOf(n)}">
      <span class="tag ${n.level}">${levelLabel[n.level]} · ${n.cat}</span>
      <h3>${n.title}</h3>
      <p>${n.desc}</p>
      <div class="meta">🕒 ${n.date}</div>
    </article>`).join("");
  $$("#newsGrid .card").forEach((c) => c.addEventListener("click", () => {
    const n = NEWS[c.dataset.i];
    openModal(`<span class="tag ${n.level}">${levelLabel[n.level]} · ${n.cat}</span><h2>${n.title}</h2><p class="muted small">${n.date}</p><p>${n.body}</p>`);
  }));
}
renderNews();

$("#typesGrid").innerHTML = SCAM_TYPES.map((t, i) => `
  <article class="card" data-i="${i}">
    <div class="type-icon">${t.icon}</div>
    <h3>${t.name}</h3>
    <p>${t.short}</p>
  </article>`).join("");
$$("#typesGrid .card").forEach((c) => c.addEventListener("click", () => {
  const t = SCAM_TYPES[c.dataset.i];
  openModal(`<div class="type-icon">${t.icon}</div><h2>${t.name}</h2><p class="muted">${t.short}</p>
    <h4>🚩 Dấu hiệu nhận biết</h4><ul>${t.signs.map((s) => `<li>${s}</li>`).join("")}</ul>
    <h4>🛡️ Cách phòng tránh</h4><ul>${t.tips.map((s) => `<li>${s}</li>`).join("")}</ul>
    <p style="margin-top:18px"><a class="btn btn-primary btn-sm" href="dao-tao.html">Học sâu hơn ở trang Đào tạo →</a></p>`);
}));
