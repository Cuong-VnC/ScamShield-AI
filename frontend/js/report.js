// Lưu và hiển thị báo cáo cá nhân trong trình duyệt.

(() => {
  const REPORTS_KEY = "scamshield_reports";
  const form = $("#reportForm");
  const urlEl = form.elements.subject;
  const catEl = form.elements.category;
  const descEl = form.elements.desc;
  const commitEl = form.elements.commit;
  const success = $("#reportSuccess");
  const failMsg = $("#reportFail");

  const PHISHING = "Website giả mạo / đánh cắp đăng nhập";
  const CATEGORIES = [PHISHING, ...SCAM_TYPES, "Khác"];
  function categoryLabel(value) {
    if (value === PHISHING) return Language.t("cat_phishing");
    if (value === "Khác") return Language.t("cat_other");
    return Language.scamType(value);
  }

  function renderCategories() {
    const selected = catEl.value;
    const options = CATEGORIES.map((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = categoryLabel(value);
      return option;
    });
    catEl.replaceChildren(...options);
    if (CATEGORIES.includes(selected)) catEl.value = selected;
  }

  function renderSavedReports() {
    const saved = getReports();
    const list = $("#savedReportsList");
    list.replaceChildren();
    if (Array.isArray(saved)) {
      for (let i = saved.length - 1; i >= 0; i--) {
        const report = saved[i];
        if (typeof report?.target !== "string") continue;
        const item = document.createElement("li");
        const target = document.createElement("strong");
        const text = document.createElement("p");
        target.textContent = report.target;
        text.textContent = [
          typeof report.category === "string" ? categoryLabel(report.category) : "",
          typeof report.desc === "string" ? report.desc : "",
        ].filter(Boolean).join(" · ");
        item.append(target, text);
        list.append(item);
      }
    }
    $("#savedReportsEmpty").hidden = list.childElementCount > 0;
  }

  function checkSubject() {
    if (!urlEl.value.trim()) return "errUrlEmpty";
    const url = UrlAnalyzer.parse(urlEl.value);
    if (!url) return "errUrlInvalid";
    return url.requestUrl ? null : "errUrlCredentials";
  }

  // ---------- Kiểm tra dữ liệu ----------
  const FIELDS = {
    subject: { el: urlEl, check: checkSubject },
    desc: { el: descEl, check: () => (!descEl.value.trim() ? "errDescEmpty" : null) },
    commit: { el: commitEl, check: () => (commitEl.checked ? null : "errCommit") },
  };
  const errors = {};

  function setError(name, key) {
    errors[name] = key;
    const { el } = FIELDS[name];
    const msg = $(`#${name}Error`);
    el.setAttribute("aria-invalid", String(Boolean(key)));
    el.closest(".field")?.classList.toggle("has-error", Boolean(key));
    msg.hidden = !key;
    $("span:last-child", msg).textContent = key ? Language.t(key) : "";
  }
  const validate = (name) => { setError(name, FIELDS[name].check()); return !errors[name]; };

  Object.entries(FIELDS).forEach(([name, { el }]) => {
    el.addEventListener(el.type === "checkbox" ? "change" : "input", () => {
      success.hidden = true;
      if (errors[name]) validate(name); // chỉ kiểm tra lại khi trường đang báo lỗi
    });
    if (el.type !== "checkbox") el.addEventListener("blur", () => { if (el.value.trim()) validate(name); });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    failMsg.hidden = true;
    const names = Object.keys(FIELDS);
    names.forEach(validate);
    const firstBad = names.find((n) => errors[n]);
    if (firstBad) { FIELDS[firstBad].el.focus(); return; }

    const target = urlEl.value.trim();
    const report = { type: "url", target, category: catEl.value, desc: descEl.value.trim(), at: Date.now() };
    const prev = getReports();
    if (!store.set(REPORTS_KEY, [...(Array.isArray(prev) ? prev : []), report])) {
      failMsg.hidden = false;
      return;
    }
    form.reset();
    renderCategories();
    renderSavedReports();
    $("#savedReports").open = true;
    $("#reportSuccessScan").href = `index.html?scan=${encodeURIComponent(target)}`;
    success.hidden = false;
    success.focus();
  });

  // Điền sẵn khi chuyển từ trang quét: bao-cao.html?kind=url&subject=...
  const params = new URLSearchParams(location.search);
  const kind = params.get("kind");
  if (params.get("subject") && (!kind || kind === "url")) urlEl.value = params.get("subject");

  Language.onChange(() => {
    renderCategories();
    renderSavedReports();
    Object.keys(FIELDS).forEach((n) => { if (errors[n]) setError(n, errors[n]); });
  });
  renderCategories();
  renderSavedReports();
})();
