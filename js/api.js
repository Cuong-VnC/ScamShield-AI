// Kết nối tới backend model AI (FastAPI trong backend/src/main.py).
// API: POST /predict, GET /health. Không phụ thuộc DOM.
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

  async function fetchJson(path, opts, timeout) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(BASE + path, { ...opts, signal: ctrl.signal });
      let data = null;
      try { data = await res.json(); } catch {}
      if (!res.ok) {
        const detail = data && data.detail;
        throw new Error(typeof detail === "string" ? detail : `Máy chủ trả về lỗi HTTP ${res.status}`);
      }
      if (!data) throw new Error("Dữ liệu trả về không hợp lệ.");
      return data;
    } catch (e) {
      if (e.name === "AbortError") throw new Error("Máy chủ phản hồi quá chậm (có thể đang khởi động lại).");
      if (e instanceof TypeError) throw new Error("Không kết nối được máy chủ model AI.");
      throw e;
    } finally {
      clearTimeout(t);
    }
  }

  // Gọi một lần dùng chung cho cả trang; cũng giúp "đánh thức" máy chủ Render sớm.
  let healthPromise = null;
  function health() {
    healthPromise ??= fetchJson("/health", {}, HEALTH_TIMEOUT).then(
      (d) => ({ ok: Boolean(d.models_loaded), data: d }),
      (e) => ({ ok: false, error: e.message })
    );
    return healthPromise;
  }

  // Cache theo URL để trang tin nhắn / trang chủ không hỏi lại cùng một link.
  const cache = new Map();
  function predict(url) {
    const key = url.trim().toLowerCase();
    if (!cache.has(key)) {
      const p = fetchJson("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      }, PREDICT_TIMEOUT);
      cache.set(key, p);
      p.catch(() => cache.delete(key)); // lỗi thì lần sau thử lại
    }
    return cache.get(key);
  }

  return { BASE, health, predict };
})();
