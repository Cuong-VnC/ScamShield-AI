// Kết nối tới backend model AI (FastAPI trong backend/src/main.py).
// API: POST /predict, GET /health, GET /stats. Không phụ thuộc DOM.
//
// Địa chỉ backend:
//   - trang mở từ localhost / 127.0.0.1 / file:// → http://localhost:8000
//   - còn lại → máy chủ Render (DEFAULT_API)
//   - ghi đè bằng ?api=https://... trên URL (được nhớ trong localStorage), ?api=reset để xoá.

const AiApi = (() => {
  const DEFAULT_API = "https://phishing-ai-api.onrender.com";
  const LOCAL_API = "http://localhost:8000";
  const API_KEY = "scamshield_api_base";
  // Máy chủ Render miễn phí có thể mất 30–60 giây để khởi động lại.
  const PREDICT_TIMEOUT = 90000;
  const HEALTH_TIMEOUT = 8000;
  const STATS_TIMEOUT = 15000;

  function resolveBase() {
    try {
      const q = new URLSearchParams(location.search).get("api");
      if (q === "reset") localStorage.removeItem(API_KEY);
      else if (q) localStorage.setItem(API_KEY, q.replace(/\/$/, ""));
      const saved = localStorage.getItem(API_KEY);
      if (saved) return saved;
    } catch {}
    const h = location.hostname;
    if (location.protocol === "file:" || h === "localhost" || h === "127.0.0.1") return LOCAL_API;
    return DEFAULT_API;
  }
  const BASE = resolveBase();

  // [redesign] Lỗi mang thêm `code` (timeout | network | http | invalid | detail) để giao diện
  // dịch VI/EN; `message` tiếng Việt giữ nguyên như bản gốc để tương thích.
  function apiError(code, message, extra) {
    return Object.assign(new Error(message), { code }, extra);
  }

  async function fetchJson(path, opts, timeout) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(BASE + path, { ...opts, signal: ctrl.signal });
      let data = null;
      try { data = await res.json(); } catch (e) {
        if (e.name === "AbortError") throw e;
      }
      if (!res.ok) {
        const detail = data && data.detail;
        const fields = {
          status: res.status,
          detail,
          backendCode: data?.error_code,
          requestId: data?.request_id,
        };
        throw typeof detail === "string"
          ? apiError("detail", detail, fields)
          : apiError("http", `Máy chủ trả về lỗi HTTP ${res.status}`, fields);
      }
      if (!data) throw apiError("invalid", "Dữ liệu trả về không hợp lệ.");
      return data;
    } catch (e) {
      if (e.name === "AbortError") throw apiError("timeout", "Máy chủ phản hồi quá chậm (có thể đang khởi động lại).");
      if (e instanceof TypeError) throw apiError("network", "Không kết nối được máy chủ model AI.");
      throw e;
    } finally {
      clearTimeout(t);
    }
  }

  // Gọi một lần dùng chung cho cả trang; cũng giúp "đánh thức" máy chủ Render sớm.
  // [redesign] health({ force: true }) hỏi lại máy chủ (dùng khi Render đang khởi động lại).
  let healthPromise = null;
  function health(opts = {}) {
    if (opts.force) healthPromise = null;
    healthPromise ??= fetchJson("/health", {}, HEALTH_TIMEOUT).then(
      (d) => ({ ok: Boolean(d.models_loaded), data: d }),
      (e) => ({ ok: false, error: e.message, code: e.code })
    );
    return healthPromise;
  }

  const VERDICT_LEVELS = new Map([
    ["Safe", "safe"], ["Phishing", "danger"], ["Phishing/Malicious", "danger"],
    ["DomainNotFound", "unknown"],
  ]);
  function verdictLevel(data) {
    return typeof data?.source === "string" && data.source.trim()
      ? VERDICT_LEVELS.get(data.status) : undefined;
  }

  // Cache theo URL chính xác, vì path và query có thể phân biệt hoa/thường.
  const cache = new Map();
  function predict(url) {
    const key = url.trim();
    if (!cache.has(key)) {
      const p = fetchJson("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: key }),
      }, PREDICT_TIMEOUT).then((data) => {
        if (!verdictLevel(data)) throw apiError("invalid", "Dữ liệu dự đoán không hợp lệ.");
        return data;
      });
      cache.set(key, p);
      p.catch(() => cache.delete(key)); // lỗi thì lần sau thử lại
    }
    return cache.get(key);
  }

  function stats() {
    return fetchJson("/stats", {}, STATS_TIMEOUT);
  }

  return { BASE, health, predict, stats, verdictLevel };
})();
