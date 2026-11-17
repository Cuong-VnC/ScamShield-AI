// Trang chủ: khung quét URL / số điện thoại / số tài khoản + số liệu + lịch sử kiểm tra.

let checkType = "url";
let scanSeq = 0; // bỏ qua kết quả AI về muộn của lần quét trước
const placeholders = {
  url: "Ví dụ: https://vietcombank-xacthuc.top/login",
  phone: "Ví dụ: 0899 123 456",
  bank: "Ví dụ: 1903 6688 9999",
};
const STATUS_TEXT = { danger: "threat", warn: "suspicious", safe: "clear" };

function setType(type) {
  checkType = type;
  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.type === type));
  $("#checkInput").placeholder = placeholders[type];
  $("#checkResult").hidden = true;
}

async function runCheck() {
  const val = $("#checkInput").value.trim();
  if (!val) return;
  const seq = ++scanSeq;
  const box = $("#checkResult");
  const status = $(".checker-status");
  const btn = $(".btn-scan");

  if (checkType !== "url") {
    const r = analyzeNumber(val, checkType);
    status.textContent = `scan://${STATUS_TEXT[r.level]}`;
    renderScanResult(box, r, checkType, val);
    return;
  }

  btn.disabled = true;
  try {
    const r = await analyzeUrlWithAi(val, (partial) => {
      if (seq !== scanSeq) return;
      status.textContent = "scan://ai-pending";
      renderScanResult(box, partial, "url", val);
    });
    if (seq !== scanSeq) return;
    status.textContent = `scan://${STATUS_TEXT[r.level]}`;
    renderScanResult(box, r, "url", val);
    if (r.parsed) saveHistory(val, r);
  } finally {
    if (seq === scanSeq) btn.disabled = false;
  }
}

// ---------- Trạng thái model AI ----------
function showAiStatus() {
  const el = $("#aiStatus");
  if (!el) return;
  AiApi.health().then((h) => {
    el.textContent = h.ok
      ? "Model AI đang hoạt động · kết hợp phân tích trên trình duyệt"
      : "Model AI đang ngoại tuyến · tạm dùng phân tích trên trình duyệt";
    el.closest(".eyebrow")?.classList.toggle("offline", !h.ok);
  });
}

// ---------- Lịch sử kiểm tra (chỉ lưu trên trình duyệt này) ----------
const HISTORY_KEY = "scamshield_url_history";
const MAX_HISTORY = 6;

function saveHistory(url, r) {
  const list = store.get(HISTORY_KEY, []).filter((x) => x.url !== url);
  list.unshift({ url, level: r.level, score: r.score, ai: r.aiState === "ok", time: Date.now() });
  store.set(HISTORY_KEY, list.slice(0, MAX_HISTORY));
  renderHistory();
}

function renderHistory() {
  const wrap = $("#scanHistory");
  if (!wrap) return;
  const list = store.get(HISTORY_KEY, []);
  wrap.hidden = !list.length;
  if (!list.length) return;
  const label = { danger: "Nguy hiểm", warn: "Đáng ngờ", safe: "An toàn" };
  $("#historyList").innerHTML = list.map((x, i) => `
    <li><button type="button" class="h-item" data-i="${i}" title="Kiểm tra lại">
      <span class="h-dot ${x.level}"></span>
      <span class="h-url mono">${esc(x.url)}</span>
      <span class="h-verdict">${label[x.level] || ""}${x.ai ? "" : " · quy tắc"}</span>
      <span class="h-time">${new Date(x.time).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
    </button></li>`).join("");
  $$(".h-item", wrap).forEach((b) => b.addEventListener("click", () => {
    setType("url");
    $("#checkInput").value = list[+b.dataset.i].url;
    runCheck();
  }));
}

$("#clearHistory")?.addEventListener("click", () => {
  store.set(HISTORY_KEY, []);
  renderHistory();
});

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
showAiStatus();
renderHistory();

// Thẻ "Tiếp tục học" hiển thị tiến độ đào tạo nếu đã bắt đầu.
const progress = store.get("scamshield_training", { lessons: {} });
const done = Object.values(progress.lessons || {}).filter((l) => l.done).length;
if (done && $("#trainingProgress")) $("#trainingProgress").textContent = `Bạn đã học ${done}/${LESSONS.length} bài`;
