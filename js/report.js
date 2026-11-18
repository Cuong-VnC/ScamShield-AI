// Trang báo cáo: form báo cáo đường link đáng ngờ (chỉ URL), lưu trên trình duyệt.
//
// Giữ cơ chế lưu của ScamShield-AI-fe: localStorage key "scamshield_reports", mỗi báo cáo
// { type, target, category, desc, at }. Báo cáo mới luôn có type: "url"; báo cáo cũ (mọi type) được giữ nguyên.
// js/scan.js đọc các báo cáo type "url" để đánh dấu nguy hiểm khi quét lại trên trình duyệt này.
// Chưa có backend nhận báo cáo → không gửi đi đâu và thông báo đúng như vậy.
// Đã bỏ danh sách "Báo cáo gần đây" và dữ liệu mẫu của nó.

(() => {
  const REPORTS_KEY = "scamshield_reports";
  const form = $("#reportForm");
  const urlEl = form.elements.subject;
  const catEl = form.elements.category;
  const descEl = form.elements.desc;
  const commitEl = form.elements.commit;
  const success = $("#reportSuccess");
  const failMsg = $("#reportFail");

  // Hình thức lừa đảo: thêm một mục dành riêng cho website giả mạo, sau đó là SCAM_TYPES (js/data.js).
  // Giá trị lưu là tên tiếng Việt như bản gốc để dữ liệu cũ/mới thống nhất; nhãn hiển thị được dịch.
  const PHISHING = "Website giả mạo / đánh cắp đăng nhập";
  const CATEGORIES = [
    { value: PHISHING, label: () => Language.t("cat_phishing") },
    ...SCAM_TYPES.map((t) => ({ value: t.name, label: () => Language.scamType(t.name) })),
    { value: "Khác", label: () => Language.t("cat_other") },
  ];
  function renderCategories() {
    const selected = catEl.value;
    catEl.innerHTML = CATEGORIES.map((c) => `<option value="${esc(c.value)}">${esc(c.label())}</option>`).join("");
    if (selected) catEl.value = selected;
  }

  // ---------- Kiểm tra dữ liệu ----------
  const FIELDS = {
    subject: { el: urlEl, check: () => (!urlEl.value.trim() ? "errUrlEmpty" : !UrlAnalyzer.parse(urlEl.value) ? "errUrlInvalid" : null) },
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
    Object.keys(FIELDS).forEach((n) => { if (errors[n]) setError(n, errors[n]); });
  });
  renderCategories();
})();
