// Trang chủ: khung quét URL / số điện thoại / số tài khoản + số liệu.

let checkType = "url";
const placeholders = {
  url: "Ví dụ: https://vietcombank-xacthuc.top/login",
  phone: "Ví dụ: 0899 123 456",
  bank: "Ví dụ: 1903 6688 9999",
};

function setType(type) {
  checkType = type;
  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.type === type));
  $("#checkInput").placeholder = placeholders[type];
  $("#checkResult").hidden = true;
}

function runCheck() {
  const val = $("#checkInput").value.trim();
  if (!val) return;
  const r = checkType === "url" ? analyzeUrl(val) : analyzeNumber(val, checkType);
  $(".checker-status").textContent = `scan://${{ danger: "threat", warn: "suspicious", safe: "clear" }[r.level]}`;
  renderScanResult($("#checkResult"), r, checkType, val);
}

$$(".tab").forEach((t) => t.addEventListener("click", () => setType(t.dataset.type)));
$$(".try").forEach((a) =>
  a.addEventListener("click", (e) => {
    e.preventDefault();
    setType(a.dataset.type);
    $("#checkInput").value = a.textContent;
    runCheck();
  })
);
$("#checkForm").addEventListener("submit", (e) => {
  e.preventDefault();
  runCheck();
});

$("#statBrands").dataset.count = BRANDS_VN.length;
$("#statKeywords").dataset.count = SCAM_KEYWORDS.length;
initCounters();

// Thẻ "Tiếp tục học" hiển thị tiến độ đào tạo nếu đã bắt đầu.
const progress = store.get("scamshield_training", { lessons: {} });
const done = Object.values(progress.lessons || {}).filter((l) => l.done).length;
if (done && $("#trainingProgress")) $("#trainingProgress").textContent = `Bạn đã học ${done}/${LESSONS.length} bài`;
