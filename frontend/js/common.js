// Phần dùng chung cho hai trang (index.html, bao-cao.html): tiện ích, header/footer, ngôn ngữ,
// trạng thái model AI, nút lên đầu trang và hiệu ứng.
// Mỗi trang khai báo <body data-page="..."> và để trống <header id="site-header"> / <footer id="site-footer">.
// Cần nạp trước: js/api.js (AiApi) và js/language.js (Language).

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => Number(n).toLocaleString(Language.locale());
const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  // Trả về true nếu ghi được (trình duyệt có thể chặn localStorage).
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  },
};
const getReports = () => store.get("scamshield_reports", []);

// ---------- Mạng xã hội ----------
// Dự án CHƯA có trang mạng xã hội chính thức. Khi có, điền địa chỉ https:// thật vào `url`.
// Mục có url rỗng/không hợp lệ chỉ hiển thị biểu tượng, không dẫn tới trang nào.
const SOCIAL_LINKS = [
  { id: "facebook", name: "Facebook", url: "" },
  { id: "x", name: "X", url: "" },
  { id: "youtube", name: "YouTube", url: "" },
  { id: "linkedin", name: "LinkedIn", url: "" },
  { id: "instagram", name: "Instagram", url: "" },
];

// ---------- Icon nét mảnh (24×24, nét 2, màu theo chữ) ----------
// Trong JS: ico("link"). Trong HTML: <span data-icon="link"></span> – được điền khi trang tải.
const ICONS = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  link: '<path d="M10 13.5a4.5 4.5 0 0 0 6.4.4l2.7-2.7a4.5 4.5 0 0 0-6.4-6.4L11.2 6.3"/><path d="M14 10.5a4.5 4.5 0 0 0-6.4-.4l-2.7 2.7a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5"/>',
  clipboard: '<rect x="5" y="4.5" width="14" height="16.5" rx="2"/><rect x="8.5" y="2.5" width="7" height="4" rx="1"/><path d="M8.5 11.5h7M8.5 15.5h5"/>',
  radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="m12 12 5.6-5.6"/>',
  shieldCheck: '<path d="M12 3 4.5 6v5.5c0 4.4 3.2 8.1 7.5 9.5 4.3-1.4 7.5-5.1 7.5-9.5V6L12 3z"/><path d="m8.8 12.2 2.3 2.3 4.3-4.6"/>',
  code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
  copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9.5 9.5h5v5h-5zM9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"/>',
  message: '<path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.4-4.7A8.5 8.5 0 1 1 21 11.5z"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5v-3a4 4 0 0 1 8 0v3M12 14.5v2.5"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8C10.5 4.5 7 4.5 7 6.5S9.5 8 12 8zM12 8c1.5-3.5 5-3.5 5-1.5S14.5 8 12 8z"/>',
  bank: '<path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  database: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>',
  tag: '<path d="M3.5 3.5h7.8l9.2 9.2-7.8 7.8-9.2-9.2z"/><circle cx="8" cy="8" r="1.5"/>',
  book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H20v14.5H6.5A1.5 1.5 0 0 0 5 19z"/><path d="M5 19a1.5 1.5 0 0 0 1.5 1.5H20M9 7.5h7"/>',
  flag: '<path d="M5 21V4h11l-2 4.5 2 4.5H5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  alert: '<path d="M10.3 4.2 2.6 17.5a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17h.01"/>',
  octagon: '<path d="M8.2 3h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2z"/><path d="m9.5 9.5 5 5M14.5 9.5l-5 5"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5.7 5.7 12.6 12.6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5h.01"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5"/>',
  arrowUp: '<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
const ico = (name, cls = "") =>
  `<svg class="ico${cls ? " " + cls : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`;
function fillIcons(root = document) {
  $$("[data-icon]", root).forEach((el) => { el.innerHTML = ico(el.dataset.icon); });
}

// Biểu tượng mạng xã hội (dạng khối, màu theo chữ).
const SOCIAL_ICONS = {
  facebook: '<path fill="currentColor" d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21z"/>',
  x: '<path fill="currentColor" d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77zm-1.08 16.18h1.7L7.4 4.73H5.58z"/>',
  youtube: '<path fill="currentColor" d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8A26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3z"/>',
  linkedin: '<path fill="currentColor" d="M5 3.5a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5zM3.1 9.4h3.8V21H3.1zM9.4 9.4H13V11h.05c.5-.95 1.75-1.95 3.6-1.95 3.85 0 4.55 2.5 4.55 5.8V21h-3.8v-5.4c0-1.3 0-2.95-1.8-2.95s-2.05 1.4-2.05 2.85V21H9.4z"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.3" cy="6.7" r="1.2" fill="currentColor"/>',
};

// Cờ Việt Nam và Vương quốc Anh (SVG nhỏ, không phụ thuộc emoji của hệ điều hành).
const FLAGS = {
  vi: '<svg class="flag" viewBox="0 0 30 20" aria-hidden="true" focusable="false"><rect width="30" height="20" fill="#DA251D"/><polygon fill="#FFFF00" points="15,4 16.35,8.15 20.71,8.15 17.18,10.71 18.53,14.85 15,12.29 11.47,14.85 12.82,10.71 9.29,8.15 13.65,8.15"/></svg>',
  en: '<svg class="flag" viewBox="0 0 60 40" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><clipPath id="ukFlagT"><path d="M30,20 h30 v20 z v20 h-30 z h-30 v-20 z v-20 h30 z"/></clipPath><rect width="60" height="40" fill="#012169"/><path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" stroke-width="8"/><path d="M0,0 L60,40 M60,0 L0,40" clip-path="url(#ukFlagT)" stroke="#C8102E" stroke-width="5"/><path d="M30,0 v40 M0,20 h60" stroke="#fff" stroke-width="12"/><path d="M30,0 v40 M0,20 h60" stroke="#C8102E" stroke-width="7"/></svg>',
};
// Mỗi lần chèn cờ cần id clipPath riêng (cờ có thể xuất hiện ở nút và trong menu cùng lúc).
const flagSvg = (lang, uid) => FLAGS[lang].replace(/ukFlagT/g, `ukFlagT-${uid}`);
const LANG_NAMES = { vi: "Tiếng Việt", en: "English" }; // tên bản ngữ, không dịch

// Logo khiên của ScamShield-AI (giữ nguyên từ bản gốc, kim radar quay khi rê chuột).
const BRAND_LOGO = `<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" focusable="false"><path d="M16 2 4 7v8c0 7.5 5.1 13.4 12 15 6.9-1.6 12-7.5 12-15V7L16 2z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="16" cy="15" r="6" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".55"/><circle cx="16" cy="15" r="2.4" fill="currentColor"/><path class="brand-sweep" d="M16 15 L22 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

// ---------- Header / footer ----------
function renderLayout() {
  const page = document.body.dataset.page;
  const brand = `
    <a href="index.html" class="brand" data-i18n-aria-label="brandHome">
      <span class="brand-mark" aria-hidden="true">${BRAND_LOGO}</span>
      <span class="brand-text">ScamShield<b>-AI</b></span>
    </a>`;

  document.body.insertAdjacentHTML("afterbegin", `<a class="skip-link" href="#main" data-i18n="skipLink"></a>`);

  const header = $("#site-header");
  header.className = "topbar";
  header.innerHTML = `
    <div class="container nav">
      ${brand}
      <div class="nav-right">
        <span class="ai-status" id="aiStatus" data-state="checking" role="status" tabindex="0">
          <span class="ai-dot" aria-hidden="true"></span>
          <span class="ai-label" id="aiStatusLabel"></span>
        </span>
        <a href="bao-cao.html" class="btn btn-report btn-sm"${page === "report" ? ' aria-current="page"' : ""}>
          ${ico("flag")}<span class="report-label" data-i18n="navReport"></span>
        </a>
        <div class="lang-menu" id="langMenu">
          <button type="button" class="lang-toggle" id="langToggle" aria-haspopup="menu" aria-expanded="false" aria-controls="langList">
            <span class="lang-current" id="langCurrent"></span>
            <svg class="lang-caret" viewBox="0 0 10 10" aria-hidden="true" focusable="false"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <ul class="lang-list" id="langList" role="menu" data-i18n-aria-label="langGroup" hidden>
            ${["vi", "en"].map((l) => `<li role="none"><button type="button" class="lang-option" role="menuitemradio" aria-checked="false" tabindex="-1" data-lang-option="${l}" lang="${l}">${flagSvg(l, "opt")}<span>${LANG_NAMES[l]}</span>${ico("check", "lang-check")}</button></li>`).join("")}
          </ul>
        </div>
      </div>
    </div>`;

  const socials = SOCIAL_LINKS.map((s) => {
    const valid = /^https:\/\/\S+$/i.test(s.url || "");
    const svg = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">${SOCIAL_ICONS[s.id] || ""}</svg>`;
    return valid
      ? `<li><a class="social" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(s.name)}" title="${esc(s.name)}">${svg}</a></li>`
      : `<li><span class="social is-pending" role="img" data-social="${esc(s.name)}">${svg}</span></li>`;
  }).join("");
  const home = page === "home" ? "" : "index.html";

  const footer = $("#site-footer");
  footer.className = "footer";
  footer.innerHTML = `
    <div class="container footer-grid">
      <div class="f-about">
        ${brand}
        <p data-i18n="footerDesc"></p>
        <ul class="socials" data-i18n-aria-label="footerSocial">${socials}</ul>
      </div>
      <nav class="f-col" aria-labelledby="fTools">
        <h2 class="f-title" id="fTools" data-i18n="footerTools"></h2>
        <ul>
          <li><a href="${home}#kiem-tra" data-i18n="footerScan"></a></li>
          <li><a href="bao-cao.html" data-i18n="footerReport"></a></li>
        </ul>
      </nav>
      <nav class="f-col" aria-labelledby="fInfo">
        <h2 class="f-title" id="fInfo" data-i18n="footerInfo"></h2>
        <ul>
          <li><a href="${home}#hoat-dong" data-i18n="footerHow"></a></li>
          <li><a href="${home}#yeu-to" data-i18n="footerExam"></a></li>
          <li><a href="${home}#khi-nao" data-i18n="footerWhen"></a></li>
        </ul>
      </nav>
      <div class="f-col f-notes">
        <h2 class="f-title" data-i18n="footerNotes"></h2>
        <ul>
          <li>${ico("info")}<span data-i18n="footerNote1"></span></li>
          <li>${ico("alert")}<span data-i18n="footerNote2"></span></li>
          <li>${ico("lock")}<span data-i18n="footerNote3"></span></li>
        </ul>
      </div>
    </div>
    <div class="container footer-bottom">
      <p>© ${new Date().getFullYear()} ScamShield-AI · <span data-i18n="footerProject"></span></p>
      <p><span data-i18n="footerDisclaimer"></span> <span data-i18n="footerData"></span></p>
    </div>`;

  document.body.insertAdjacentHTML("beforeend", `
    <button type="button" class="to-top" id="toTop" data-i18n-aria-label="toTop" data-i18n-title="toTop">${ico("arrowUp")}</button>
    <div class="sr-only" id="srAnnounce" role="status" aria-live="polite"></div>`);
}
renderLayout();
fillIcons();

// Tooltip "chưa có trang chính thức" cho biểu tượng mạng xã hội chưa có địa chỉ.
function updateSocialLabels() {
  $$(".social.is-pending").forEach((el) => {
    const label = Language.t("socialSoon", { name: el.dataset.social });
    el.setAttribute("aria-label", label);
    el.title = label;
  });
}

// Thông báo ngắn cho trình đọc màn hình.
function announce(text) {
  const el = $("#srAnnounce");
  el.textContent = "";
  setTimeout(() => { el.textContent = text; }, 30);
}

// ---------- Ngôn ngữ: nút cờ + menu thả xuống ----------
// Nút chỉ hiện cờ của ngôn ngữ đang dùng. Mở menu: bấm/chạm, phím mũi tên, hoặc rê chuột (thiết bị có chuột).
// Chỉ đổi ngôn ngữ khi chọn một mục; Escape hoặc bấm ra ngoài thì đóng.
const LangMenu = (() => {
  const wrap = $("#langMenu"), toggle = $("#langToggle"), list = $("#langList");
  const items = $$(".lang-option", list);
  const canHover = matchMedia("(hover: hover) and (pointer: fine)");
  let pinned = false;   // mở bằng bấm/bàn phím → không tự đóng khi chuột rời đi
  let closeTimer = null;
  const isOpen = () => !list.hidden;

  function render() {
    const lang = Language.get();
    $("#langCurrent").innerHTML = flagSvg(lang, "cur");
    const label = Language.t("langToggle", { name: LANG_NAMES[lang] });
    toggle.setAttribute("aria-label", label);
    toggle.title = label;
    items.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.langOption === lang)));
  }
  function open(byHover = false, focusItem = false) {
    clearTimeout(closeTimer);
    if (!byHover) pinned = true;
    list.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    if (focusItem) (items.find((b) => b.getAttribute("aria-checked") === "true") || items[0]).focus();
  }
  function close(returnFocus = false) {
    clearTimeout(closeTimer);
    pinned = false;
    if (!isOpen()) return;
    list.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    if (returnFocus) toggle.focus();
  }

  toggle.addEventListener("click", () => { if (isOpen() && pinned) close(); else open(); });
  toggle.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); open(false, true); }
  });
  list.addEventListener("keydown", (e) => {
    const i = items.indexOf(document.activeElement);
    const go = (n) => { e.preventDefault(); items[(n + items.length) % items.length].focus(); };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(items.length - 1);
    else if (e.key === "Tab") close();
  });
  items.forEach((b) => b.addEventListener("click", () => {
    Language.set(b.dataset.langOption);
    close(true);
  }));
  wrap.addEventListener("mouseenter", () => { if (canHover.matches) open(true); });
  wrap.addEventListener("mouseleave", () => {
    if (canHover.matches && !pinned) closeTimer = setTimeout(() => close(), 200);
  });
  document.addEventListener("click", (e) => { if (isOpen() && !wrap.contains(e.target)) close(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) close(wrap.contains(document.activeElement));
  });
  wrap.addEventListener("focusout", (e) => { if (isOpen() && e.relatedTarget && !wrap.contains(e.relatedTarget)) close(); });

  return { render, close };
})();

// ---------- Trạng thái model AI trên header ----------
// Chỉ hiện "đang hoạt động" (xanh) khi GET /health trả models_loaded = true.
// Không kết nối được / model chưa nạp → màu cam; tự hỏi lại vài lần vì máy chủ Render có thể đang khởi động.
const AiStatus = (() => {
  const RETRY_DELAYS = [10000, 20000, 30000, 45000];
  let state = "checking";
  let retries = 0;
  let timer = null;

  function render() {
    const el = $("#aiStatus");
    if (!el) return;
    const key = { checking: "aiChecking", online: "aiOnline", offline: "aiOffline", degraded: "aiDegraded" }[state];
    const tip = { checking: "aiTipChecking", online: "aiTipOnline", offline: "aiTipOffline", degraded: "aiTipDegraded" }[state];
    el.dataset.state = state;
    $("#aiStatusLabel").textContent = Language.t(key);
    el.title = Language.t(tip, { api: AiApi.BASE });
    el.setAttribute("aria-label", `${Language.t(key)}. ${el.title}`);
  }

  async function check(force = false) {
    clearTimeout(timer);
    const h = await AiApi.health({ force });
    state = h.ok ? "online" : h.data ? "degraded" : "offline";
    render();
    if (!h.ok && retries < RETRY_DELAYS.length) timer = setTimeout(() => check(true), RETRY_DELAYS[retries++]);
  }

  // Gọi sau một lần quét có model AI trả lời: hỏi lại /health nếu header chưa xanh.
  function recheck() {
    if (state !== "online") check(true);
  }

  return { render, check, recheck, get state() { return state; } };
})();

// ---------- Nút lên đầu trang ----------
// Ẩn ở đầu trang; chỉ hiện khi đã cuộn khá xa (màn hình rộng) hoặc khi footer đã lộ rõ.
(() => {
  const btn = $("#toTop");
  const footer = $("#site-footer");
  let ticking = false;
  function update() {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const footerTop = footer.getBoundingClientRect().top;
    const nearEnd = footerTop < vh - 80;
    const farDown = window.innerWidth > 720 && y > vh * 1.6;
    btn.classList.toggle("show", y > 400 && (nearEnd || farDown));
  }
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener("resize", update);
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    const target = $("#checkInput") || $("#main");
    // Đưa focus về đầu trang cho người dùng bàn phím mà không cuộn giật.
    setTimeout(() => target?.focus({ preventScroll: true }), prefersReducedMotion() ? 0 : 450);
  });
  update();
})();

// ---------- Hiệu ứng ----------
// Hiện dần các khối khi cuộn tới. Gọi lại initReveal() sau khi chèn nội dung mới.
const revealObs = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add("in");
    revealObs.unobserve(en.target);
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }) : null;
function initReveal(root = document) {
  $$(".reveal:not(.in)", root).forEach((el, i) => {
    if (!revealObs) { el.classList.add("in"); return; }
    el.style.transitionDelay = `${(i % 4) * 70}ms`;
    revealObs.observe(el);
  });
}

// Đổi ngôn ngữ: cập nhật trạng thái AI, nhãn mạng xã hội và định dạng số đã đếm xong;
// xoá thông báo cũ của trình đọc màn hình để không còn câu ở ngôn ngữ trước.
Language.onChange(() => {
  $("#srAnnounce").textContent = "";
  LangMenu.render();
  AiStatus.render();
  updateSocialLabels();
});
Language.apply();
initReveal();
AiStatus.check();
