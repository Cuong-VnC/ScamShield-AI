/* ===========================================================================
   CÁC TIỆN ÍCH VÀ BỐ CỤC CHUNG CHỈ DÀNH CHO TRANG QUÉT URL
   ----------------------------------------------------------------------------
   - Giữ logo khiên và chữ ScamShield-AI từ code frontend gốc.
   - Chỉ còn điều hướng Quét URL và hai nút VI / EN.
   - Không có modal, đăng nhập, đổi theme, trang phụ hay menu chức năng khác.
   - Giữ các hiệu ứng được dùng: đèn con trỏ, hiện dần, bộ đếm tăng dần.
   =========================================================================== */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// Escape các ký tự HTML trước khi chèn dữ liệu người dùng / kết quả động.
const esc = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const fmt = number => Number(number).toLocaleString(Language.get() === 'en' ? 'en-US' : 'vi-VN');

// Giữ lại SVG logo khiên nguyên gốc và hiệu ứng quay của nhánh quét radar.
const BRAND_MARK = `<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path d="M16 2 4 7v8c0 7.5 5.1 13.4 12 15 6.9-1.6 12-7.5 12-15V7L16 2z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="16" cy="15" r="6" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".55"/><circle cx="16" cy="15" r="2.4" fill="currentColor"/><path class="brand-sweep" d="M16 15 L22 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

function renderLayout() {
  const header = $('#site-header');
  header.className = 'topbar';
  header.innerHTML = `
    <div class="container nav">
      <a class="brand" href="#kiem-tra" aria-label="ScamShield-AI">
        <span class="brand-mark" aria-hidden="true">${BRAND_MARK}</span>
        <span class="brand-text">ScamShield<b>-AI</b></span>
      </a>
      <div class="nav-tools">
        <a class="nav-scan-link" href="#kiem-tra" data-i18n="homeLink">Quét URL</a>
        <div class="lang-switch" role="group" data-i18n-aria-label="languageLabel" aria-label="Chọn ngôn ngữ">
          <button class="lang-btn" type="button" data-lang="vi" aria-pressed="true">VI</button>
          <button class="lang-btn" type="button" data-lang="en" aria-pressed="false">EN</button>
        </div>
      </div>
    </div>`;

  const footer = $('#site-footer');
  footer.className = 'footer';
  footer.innerHTML = `
    <div class="container footer-grid">
      <div class="f-about">
        <a href="#kiem-tra" class="brand">
          <span class="brand-mark" aria-hidden="true">${BRAND_MARK}</span>
          <span class="brand-text">ScamShield<b>-AI</b></span>
        </a>
        <p class="muted" data-i18n="footerDescription"></p>
        <p class="f-status mono"><span class="live-dot"></span><span data-i18n="footerStatus"></span></p>
      </div>
      <div class="footer-note">
        <p data-i18n="footerNote"></p>
        <p class="small muted" data-i18n="footerSources"></p>
      </div>
    </div>
    <div class="container footer-bottom">
      <p>© ${new Date().getFullYear()} ScamShield-AI · <span data-i18n="footerCopyright"></span></p>
      <button type="button" class="icon-btn to-top" id="toTop" data-i18n-title="footerTop" title="Lên đầu trang" aria-label="Lên đầu trang">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
      </button>
    </div>`;

  // Nút cuộn lên đầu trang vẫn được giữ như một tiện ích điều hướng.
  $('#toTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // Hai nút ngôn ngữ dùng chung Language.set để cập nhật toàn bộ giao diện.
  $$('[data-lang]').forEach(button => button.addEventListener('click', () => Language.set(button.dataset.lang)));
  Language.apply();
}
renderLayout();

/* Hiệu ứng đèn soi: chỉ chạy khi trang có phần tử .spot hoặc .card.
   Các thẻ chức năng đã xóa, nhưng vẫn giữ mã hiệu ứng gốc để tái sử dụng. */
document.addEventListener('pointermove', event => {
  const element = event.target.closest?.('.card, .spot');
  if (!element) return;
  const rect = element.getBoundingClientRect();
  element.style.setProperty('--mx', `${event.clientX - rect.left}px`);
  element.style.setProperty('--my', `${event.clientY - rect.top}px`);
});

// Hiệu ứng hiện dần khi cuộn: giữ phương án tương thích trình duyệt cũ.
let revealObserver = null;
if ('IntersectionObserver' in window) {
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
}
function initReveal(root = document) {
  $$('.reveal:not(.in)', root).forEach((element, index) => {
    element.style.transitionDelay = `${(index % 6) * 60}ms`;
    if (revealObserver) revealObserver.observe(element);
    else element.classList.add('in');
  });
}
initReveal();

// Đếm số chạy từ 0 đến data-count, đúng hiệu ứng thống kê của frontend gốc.
let counterObserver = null;
function animateCounter(element) {
  const end = Number(element.dataset.count);
  const start = performance.now();
  function step(time) {
    const progress = Math.min((time - start) / 1400, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = fmt(Math.round(end * eased));
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function initCounters() {
  if ('IntersectionObserver' in window) {
    counterObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      });
    });
    $$('[data-count]').forEach(element => counterObserver.observe(element));
  } else {
    $$('[data-count]').forEach(animateCounter);
  }
}

// Chỉ cập nhật cách viết số liệu khi đổi VI/EN; không reset điểm phân tích.
Language.onChange(() => {
  $$('[data-count]').forEach(el => { if (el.textContent && el.textContent !== '0') el.textContent = fmt(Number(el.dataset.count)); });
  $$('[data-i18n-aria-label]').forEach(el => el.setAttribute('aria-label', Language.t(el.dataset.i18nAriaLabel)));
  $$('[data-i18n-title]').forEach(el => {
    el.title = Language.t(el.dataset.i18nTitle);
    el.setAttribute('aria-label', Language.t(el.dataset.i18nTitle));
  });
});
