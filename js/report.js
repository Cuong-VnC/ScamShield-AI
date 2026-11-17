// Trang báo cáo: form gửi báo cáo (lưu trên trình duyệt) + danh sách báo cáo gần đây.

const typeLabel = { url: "Website", phone: "SĐT", bank: "STK", social: "MXH" };
const form = $("#reportForm");
$("#reportCategory").innerHTML = SCAM_TYPES.map((t) => `<option>${t.name}</option>`).join("") + "<option>Khác</option>";

// Điền sẵn khi chuyển từ trang quét: bao-cao.html?kind=url&subject=...
const params = new URLSearchParams(location.search);
if (params.get("kind") && form.kind.querySelector(`option[value="${params.get("kind")}"]`)) form.kind.value = params.get("kind");
if (params.get("subject")) form.subject.value = params.get("subject");

function renderRecent() {
  const seed = [
    { type: "url", target: "nhanqua-tiktok.xyz", category: "Trúng thưởng, quà tặng", time: "2 giờ trước" },
    { type: "phone", target: "0587 111 222", category: "Mạo danh cơ quan chức năng", time: "5 giờ trước" },
    { type: "bank", target: "0451000123456", category: "Việc nhẹ lương cao", time: "Hôm qua" },
  ];
  const mine = getReports().slice(-5).reverse().map((r) => ({ ...r, time: new Date(r.at).toLocaleString("vi-VN") + " (bạn gửi)" }));
  $("#recentReports").innerHTML = [...mine, ...seed].slice(0, 6).map((r) =>
    `<li><b>[${typeLabel[r.type]}] ${esc(r.target)}</b><small>${esc(r.category)} · ${esc(r.time)}</small></li>`).join("");
}
renderRecent();

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const report = { type: form.kind.value, target: form.subject.value.trim(), category: form.category.value, desc: form.desc.value.trim(), at: Date.now() };
  store.set("scamshield_reports", [...getReports(), report]);
  form.reset();
  const msg = $("#reportMsg");
  msg.textContent = "✅ Cảm ơn bạn! Báo cáo đã được ghi nhận và đang chờ kiểm duyệt.";
  msg.hidden = false;
  setTimeout(() => (msg.hidden = true), 5000);
  renderRecent();
});
