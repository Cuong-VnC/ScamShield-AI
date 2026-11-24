// Trang chủ: quét URL, số liệu Supabase và lịch sử trên trình duyệt.

(() => {
  let scanSeq = 0;      // bỏ qua kết quả AI về muộn của lần quét trước
  let lastScan = null;  // { value, r } – để vẽ lại khi đổi ngôn ngữ mà không gọi lại model
  let busy = false;

  const input = $("#checkInput");
  const form = $("#checkForm");
  const btn = $("#scanBtn");
  const box = $("#checkResult");
  const zone = $("#scanZone");
  const historyWrap = $("#scanHistory");
  const fieldError = $("#checkError");

  function setBusy(on) {
    busy = on;
    btn.disabled = on;
    btn.classList.toggle("is-busy", on);
    form.setAttribute("aria-busy", String(on));
    $("#scanBtnLabel").textContent = Language.t(on ? "scanBusy" : "scanBtn");
  }

  function showFieldError(on) {
    fieldError.hidden = !on;
    input.setAttribute("aria-invalid", String(on));
    $("span:last-child", fieldError).textContent = on ? Language.t("emptyInput") : "";
  }

  const updateZone = () => { zone.hidden = box.hidden && historyWrap.hidden; };

  // Đưa khối kết quả vào tầm nhìn (chỉ khi nó đang nằm ngoài màn hình).
  function scrollToResult() {
    const top = box.getBoundingClientRect().top;
    if (top < 60 || top > window.innerHeight * 0.55)
      box.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }

  async function runCheck(override) {
    if (override !== undefined) input.value = override;
    const val = input.value;
    if (!val.trim()) { showFieldError(true); input.focus(); return; }
    showFieldError(false);

    const seq = ++scanSeq;
    let scrolled = false;
    const show = (r) => {
      lastScan = { value: val, r };
      renderScanResult(box, r, val);
      updateZone();
      if (!scrolled) { scrolled = true; scrollToResult(); }
    };

    setBusy(true);
    try {
      const r = await analyzeUrlWithAi(val, (partial) => {
        if (seq !== scanSeq) return;
        show(partial);
        announce(Language.t("announcePending"));
      });
      if (seq !== scanSeq) return;
      show(r);
      announce(Language.t("announceDone", { verdict: resultTitle(r) }));
      if (r.parsed?.requestUrl) saveHistory(val.trim(), r);
      if (r.aiState === "ok") AiStatus.recheck();
    } finally {
      if (seq === scanSeq) setBusy(false);
    }
  }

  // ---------- Lịch sử kiểm tra (chỉ lưu trên trình duyệt này) ----------
  const HISTORY_KEY = "scamshield_url_history";
  const MAX_HISTORY = 6;

  function readHistory() {
    const raw = store.get(HISTORY_KEY, []);
    return Array.isArray(raw) ? raw.filter((x) => x && typeof x.url === "string") : [];
  }

  function saveHistory(url, r) {
    const list = readHistory().filter((x) => x.url !== url);
    list.unshift({ url, status: r.ai?.status ?? null, source: r.ai?.source ?? null, time: Date.now() });
    store.set(HISTORY_KEY, list.slice(0, MAX_HISTORY));
    renderHistory();
  }

  function renderHistory() {
    const list = readHistory();
    historyWrap.hidden = !list.length;
    updateZone();
    if (!list.length) { $("#historyList").innerHTML = ""; return; }
    const label = { danger: "levelDanger", safe: "levelSafe", unknown: "levelUnknown" };
    $("#historyList").innerHTML = list.map((x, i) => {
      const d = new Date(x.time);
      const valid = !isNaN(d);
      const time = valid ? d.toLocaleString(Language.locale(), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
      const prediction = AiApi.verdictLevel(x);
      const level = prediction || "unknown";
      const verdict = x.status === "DomainNotFound" && prediction ? "titleNotFound" : label[level];
      const parsed = UrlAnalyzer.parse(x.url);
      const shownUrl = parsed?.hasUserInfo ? parsed.host : x.url;
      return `
      <li class="h-item">
        <span class="h-dot ${level}" aria-hidden="true"></span>
        <span class="h-main">
          <span class="h-url mono" title="${esc(shownUrl)}">${esc(shownUrl)}</span>
          <span class="h-meta">
            <b class="h-verdict ${level}">${esc(Language.t(verdict))}</b>
            <span>${esc(prediction ? Language.t("chipSource", { src: Language.source(x.source) }) : Language.t("historyUnverified"))}</span>
            ${valid ? `<time datetime="${d.toISOString()}">${esc(time)}</time>` : ""}
          </span>
        </span>
        <button type="button" class="btn btn-ghost btn-xs h-rescan" data-i="${i}" aria-label="${esc(Language.t("historyRescanAria", { url: shownUrl }))}">
          ${ico("refresh")}<span>${esc(Language.t("historyRescan"))}</span>
        </button>
      </li>`;
    }).join("");
    $$(".h-rescan", historyWrap).forEach((b) => b.addEventListener("click", () => runCheck(list[+b.dataset.i].url)));
  }

  $("#clearHistory").addEventListener("click", () => {
    store.set(HISTORY_KEY, []);
    renderHistory();
    announce(Language.t("announceCleared"));
    input.focus({ preventScroll: true });
  });

  // ---------- Sự kiện ----------
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!busy) runCheck();
  });
  input.addEventListener("input", () => { if (!fieldError.hidden && input.value.trim()) showFieldError(false); });

  // Nút "Thử lại với model AI" trong khối kết quả khi backend lỗi.
  box.addEventListener("click", (e) => {
    if (e.target.closest('[data-action="retry-ai"]') && lastScan && !busy) runCheck(lastScan.value);
  });

  // Nút CTA "Quét một đường link ngay": cuộn lên ô quét và đặt con trỏ vào đó.
  $$("[data-focus-scan]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    $("#kiem-tra").scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
    setTimeout(() => input.focus({ preventScroll: true }), prefersReducedMotion() ? 0 : 500);
  }));

  const statFields = $$("[data-stat]");
  const statsStatus = $("#stats-status");
  let statsData = null;
  let statsLoading = true;

  function renderStats() {
    const locale = Language.locale();
    const count = new Intl.NumberFormat(locale);
    const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 });
    let present = 0;
    for (const field of statFields) {
      const value = statsData?.[field.dataset.stat];
      const isRatio = field.dataset.stat === "malicious_ratio_percent";
      const valid = isRatio ? Number.isFinite(value) && value >= 0 && value <= 100
                            : Number.isSafeInteger(value) && value >= 0;
      if (!valid) {
        field.textContent = "—";
        continue;
      }
      present++;
      if (isRatio && value > 0 && value < 0.01) {
        field.textContent = "<" + percent.format(0.0001);
      } else {
        field.textContent = isRatio ? percent.format(value / 100) : count.format(value);
      }
    }
    statsStatus.textContent = statsLoading ? Language.t("statsLoading")
      : present === statFields.length ? ""
      : Language.t(present ? "statsPartial" : "statsUnavailable");
  }

  async function loadStats() {
    try {
      statsData = await AiApi.stats();
    } catch {
      statsData = null;
    } finally {
      statsLoading = false;
      renderStats();
    }
  }

  // Đổi ngôn ngữ: vẽ lại kết quả, số liệu, lịch sử và nhãn nút.
  Language.onChange(() => {
    if (lastScan) renderScanResult(box, lastScan.r, lastScan.value);
    renderHistory();
    $("#scanBtnLabel").textContent = Language.t(busy ? "scanBusy" : "scanBtn");
    if (!fieldError.hidden) showFieldError(true);
    renderStats();
  });

  // ---------- Khởi tạo ----------
  setBusy(false);
  renderHistory();
  renderStats();
  loadStats();

  // Mở từ trang báo cáo: index.html?scan=<url> → điền sẵn và quét ngay (rồi bỏ tham số khỏi thanh địa chỉ).
  const params = new URLSearchParams(location.search);
  const pre = params.get("scan");
  if (pre) {
    params.delete("scan");
    const qs = params.toString();
    history.replaceState(null, "", location.pathname + (qs ? `?${qs}` : "") + location.hash);
    runCheck(pre);
  }
})();
