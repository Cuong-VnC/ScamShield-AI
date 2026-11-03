// Phần dùng chung cho mọi trang: tiện ích, header/footer, giao diện sáng/tối, hiệu ứng, modal.
// Mỗi trang khai báo <body data-page="..."> và để trống <header id="site-header"> / <footer id="site-footer">.

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => n.toLocaleString("vi-VN");

const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};
const getReports = () => store.get("scamshield_reports", []);

// ---------- Header / footer ----------
const PAGES = [
  { id: "home", href: "index.html", label: "Quét URL" },
  { id: "message", href: "tin-nhan.html", label: "Tin nhắn" },
  { id: "warnings", href: "canh-bao.html", label: "Cảnh báo" },
  { id: "training", href: "dao-tao.html", label: "Đào tạo" },
  { id: "response", href: "ung-pho.html", label: "Bị lừa?" },
];

function renderLayout() {
  const page = document.body.dataset.page;
  const logo = `<svg viewBox="0 0 32 32" width="30" height="30"><path d="M16 2 4 7v8c0 7.5 5.1 13.4 12 15 6.9-1.6 12-7.5 12-15V7L16 2z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="16" cy="15" r="6" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".55"/><circle cx="16" cy="15" r="2.4" fill="currentColor"/><path class="brand-sweep" d="M16 15 L22 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  const links = PAGES.map((p) => `<a href="${p.href}"${p.id === page ? ' class="active" aria-current="page"' : ""}>${p.label}</a>`).join("");

  $("#site-header").className = "topbar";
  $("#site-header").innerHTML = `
    <div class="container nav">
      <a href="index.html" class="brand" aria-label="ScamShield-AI – trang chủ">
        <span class="brand-mark" aria-hidden="true">${logo}</span>
        <span class="brand-text">ScamShield<b>-AI</b></span>
      </a>
      <nav class="menu" id="menu">
        ${links}
        <a href="bao-cao.html" class="btn btn-sm btn-danger">Báo cáo lừa đảo</a>
      </nav>
      <div class="nav-tools">
        <button class="icon-btn" id="themeBtn" aria-label="Đổi giao diện sáng/tối" title="Đổi giao diện sáng/tối">
          <svg class="i-sun" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
          <svg class="i-moon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>
        </button>
        <button class="icon-btn menu-btn" id="menuBtn" aria-label="Mở menu">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>
        </button>
      </div>
    </div>`;

  const col = (title, items) => `
    <div class="f-col">
      <h4 class="mono">${title}</h4>
      <ul>${items.map(([href, label, ext]) => `<li><a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ""}>${label}</a></li>`).join("")}</ul>
    </div>`;

  $("#site-footer").className = "footer";
  $("#site-footer").innerHTML = `
    <div class="container footer-grid">
      <div class="f-about">
        <a href="index.html" class="brand">
          <span class="brand-mark" aria-hidden="true">${logo}</span>
          <span class="brand-text">ScamShield<b>-AI</b></span>
        </a>
        <p class="muted">Kiểm tra đường link, số điện thoại, số tài khoản và học cách nhận diện lừa đảo – kèm giải thích vì sao.</p>
        <p class="f-status mono"><span class="live-dot"></span>Phân tích ngay trên trình duyệt</p>
      </div>
      ${col("Công cụ", [["index.html", "Quét URL / SĐT / STK"], ["tin-nhan.html", "Phân tích tin nhắn"], ["bao-cao.html", "Báo cáo lừa đảo"]])}
      ${col("Kiến thức", [["canh-bao.html#tin-canh-bao", "Cảnh báo mới nhất"], ["canh-bao.html#thu-doan", "Thủ đoạn phổ biến"], ["canh-bao.html#nguyen-tac", "6 nguyên tắc vàng"], ["dao-tao.html", "Khoá đào tạo"]])}
      <div class="f-col f-help">
        <h4 class="mono">Khẩn cấp</h4>
        <a class="f-hotline" href="tel:113"><b class="mono">113</b><span>Công an</span></a>
        <a class="f-hotline" href="sms:5656"><b class="mono">5656</b><span>Báo tin nhắn rác</span></a>
        <a class="f-link" href="ung-pho.html">Lỡ bị lừa – làm gì ngay? →</a>
        <a class="f-link" href="https://canhbao.khonggianmang.gov.vn" target="_blank" rel="noopener">canhbao.khonggianmang.gov.vn ↗</a>
      </div>
    </div>
    <div class="container footer-bottom">
      <p>© ${new Date().getFullYear()} ScamShield-AI · Dự án nhóm (group project)</p>
      <p>Dữ liệu tham khảo: PhishVN, PhiUSIIL (CC BY 4.0). Tin cảnh báo và danh sách đen là dữ liệu mẫu; kết quả kiểm tra chỉ mang tính tham khảo.</p>
      <button class="icon-btn to-top" id="toTop" aria-label="Lên đầu trang" title="Lên đầu trang">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
      </button>
    </div>`;
  $("#toTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal" id="modal" hidden>
      <div class="modal-box panel" role="dialog" aria-modal="true">
        <button class="modal-close" aria-label="Đóng">×</button>
        <div id="modalBody"></div>
      </div>
    </div>`);
}
renderLayout();

// ---------- Menu ----------
$("#menuBtn").addEventListener("click", () => $("#menu").classList.toggle("open"));
$$("#menu a").forEach((a) => a.addEventListener("click", () => $("#menu").classList.remove("open")));

// ---------- Giao diện sáng / tối ----------
$("#themeBtn").addEventListener("click", () => {
  const root = document.documentElement;
  const current = root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  root.dataset.theme = current === "dark" ? "light" : "dark";
  try { localStorage.setItem("scamshield_theme", root.dataset.theme); } catch {}
});

// ---------- Modal ----------
const modal = $("#modal");
function openModal(html) { $("#modalBody").innerHTML = html; modal.hidden = false; }
modal.addEventListener("click", (e) => { if (e.target === modal || e.target.classList.contains("modal-close")) modal.hidden = true; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") modal.hidden = true; });

// ---------- Hiệu ứng ----------
// Đèn soi theo con trỏ trên thẻ (CSS đọc --mx, --my).
document.addEventListener("pointermove", (e) => {
  const el = e.target.closest?.(".card, .spot");
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
});

// Hiện dần các khối khi cuộn tới. Gọi lại initReveal() sau khi chèn nội dung mới.
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add("in");
    revealObs.unobserve(en.target);
  });
}, { threshold: 0.12 });
function initReveal(root = document) {
  $$(".reveal:not(.in)", root).forEach((el, i) => {
    el.style.transitionDelay = `${(i % 6) * 60}ms`;
    revealObs.observe(el);
  });
}
initReveal();

// Đếm số chạy lên cho các phần tử có data-count.
const counterObs = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const el = en.target, end = +el.dataset.count, t0 = performance.now();
    const step = (t) => {
      const p = Math.min((t - t0) / 1400, 1);
      el.textContent = fmt(Math.round(end * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    counterObs.unobserve(el);
  });
});
function initCounters() { $$("[data-count]").forEach((el) => counterObs.observe(el)); }
