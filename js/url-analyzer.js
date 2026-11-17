// Bộ phân tích URL theo pipeline của dự án: chuẩn hoá → tách cấu trúc → trích đặc trưng (F1, F2, F4) → điểm + lý do.
// Mỗi đặc trưng đóng góp một giá trị (thang log-odds) giống cách SHAP giải thích model, nên
// khi có model thật chỉ cần thay nguồn `reasons` mà giao diện giữ nguyên.
// Không phụ thuộc DOM – cần nạp dictionaries.js trước.

const UrlAnalyzer = (() => {
  const BIAS = -3.0; // xác suất nền ≈ 5%
  const LEVELS = { danger: 0.7, warn: 0.35 };
  const POS_WEIGHT = { sub: 1.0, dom: 1.4, path: 0.7 };
  const POS_NAME = { sub: "tên miền phụ", dom: "tên miền chính", path: "đường dẫn" };

  const SUFFIXES = new Set(PUBLIC_SUFFIXES);
  const KEYWORDS = new Map(SCAM_KEYWORDS.map((x) => [x.k, x]));
  const BRAND_KEYS = new Map();
  BRANDS_VN.forEach((b) => b.keys.forEach((k) => BRAND_KEYS.set(k, b)));
  const DICT = new Set([...KEYWORDS.keys(), ...BRAND_KEYS.keys(), ...COMMON_WORDS]);
  const MAX_WORD = Math.max(...[...DICT].map((w) => w.length));
  const OFFICIAL = new Map();
  BRANDS_VN.forEach((b) => b.domains.forEach((d) => OFFICIAL.set(d, b)));

  // Ký tự dễ nhầm: số thay chữ (vietc0mbank) và chữ Cyrillic/Hy Lạp trông giống Latin.
  const LOOKALIKE = { 0: "o", 1: "l", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b",
    "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y", "і": "i", "ј": "j", "ѕ": "s", "ԁ": "d", "ο": "o", "α": "a", "ν": "v" };
  const unLookalike = (s) => [...s].map((c) => LOOKALIKE[c] ?? c).join("").replace(/rn/g, "m").replace(/vv/g, "w");
  const stripVi = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

  // ---------- Punycode (RFC 3492) ----------
  function punyDecode(input) {
    const base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700;
    const adapt = (delta, num, first) => {
      delta = first ? Math.floor(delta / damp) : delta >> 1;
      delta += Math.floor(delta / num);
      let k = 0;
      while (delta > ((base - tMin) * tMax) >> 1) { delta = Math.floor(delta / (base - tMin)); k += base; }
      return k + Math.floor(((base - tMin + 1) * delta) / (delta + skew));
    };
    const digitOf = (c) => (c >= 48 && c <= 57 ? c - 22 : c >= 97 && c <= 122 ? c - 97 : c >= 65 && c <= 90 ? c - 65 : base);
    let n = 128, i = 0, bias = 72;
    const b = input.lastIndexOf("-");
    const out = b > 0 ? [...input.slice(0, b)].map((c) => c.codePointAt(0)) : [];
    for (let idx = b > 0 ? b + 1 : 0; idx < input.length; ) {
      const oldi = i;
      for (let w = 1, k = base; ; k += base) {
        if (idx >= input.length) throw new Error("punycode");
        const digit = digitOf(input.charCodeAt(idx++));
        if (digit >= base) throw new Error("punycode");
        i += digit * w;
        const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
        if (digit < t) break;
        w *= base - t;
      }
      const len = out.length + 1;
      bias = adapt(i - oldi, len, oldi === 0);
      n += Math.floor(i / len);
      i %= len;
      out.splice(i++, 0, n);
    }
    return String.fromCodePoint(...out);
  }
  const toUnicode = (host) => host.split(".").map((l) => {
    if (!l.startsWith("xn--")) return l;
    try { return punyDecode(l.slice(4)); } catch { return l; }
  }).join(".");

  // ---------- Tách từ không dấu (quy hoạch động: ít ký tự lạ nhất, rồi ít từ nhất) ----------
  function segment(chunk) {
    const n = chunk.length;
    const best = Array(n + 1).fill(null);
    best[0] = { unk: 0, cnt: 0 };
    const better = (a, b) => !b || a.unk < b.unk || (a.unk === b.unk && a.cnt < b.cnt);
    for (let i = 0; i < n; i++) {
      if (!best[i]) continue;
      const u = { unk: best[i].unk + 1, cnt: best[i].cnt + 1, prev: i, known: false };
      if (better(u, best[i + 1])) best[i + 1] = u;
      for (let L = 2; L <= Math.min(MAX_WORD, n - i); L++) {
        if (!DICT.has(chunk.substr(i, L))) continue;
        const k = { unk: best[i].unk, cnt: best[i].cnt + 1, prev: i, known: true };
        if (better(k, best[i + L])) best[i + L] = k;
      }
    }
    const parts = [];
    for (let j = n; j > 0; j = best[j].prev) parts.unshift({ t: chunk.slice(best[j].prev, j), known: best[j].known });
    // gộp các ký tự lạ liền nhau thành một token
    return parts.reduce((acc, p) => {
      const last = acc[acc.length - 1];
      if (last && !last.known && !p.known) last.t += p.t;
      else acc.push({ ...p });
      return acc;
    }, []);
  }

  // Tách một phần URL thành các token có gắn vị trí (sub:, dom:, path:).
  function tokenize(text, pos) {
    // nối các từ cách nhau bởi "-" hoặc "_" (xac-minh → xacminh) rồi để bộ tách từ tự tách lại
    return stripVi(text).split(/[^a-z0-9_-]+/).map((c) => c.replace(/[-_]/g, "")).filter(Boolean).flatMap((chunk) => {
      const parts = segment(chunk);
      return parts.map((p, i) => ({
        ...p, pos, chunk,
        // key ngắn chỉ hợp lệ khi đứng riêng hoặc kẹp giữa các từ đã biết
        isolated: (i === 0 || parts[i - 1].known) && (i === parts.length - 1 || parts[i + 1].known),
      }));
    });
  }

  // ---------- Chuẩn hoá + tách cấu trúc ----------
  function parse(input) {
    let s = input.trim();
    if (!s) return null;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = "http://" + s;
    let u;
    try { u = new URL(s); } catch { return null; }
    const host = u.hostname.replace(/\.$/, "").replace(/^www\d?\./, "");
    if (!host.includes(".") && !host.startsWith("[")) return null;
    const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[");
    const labels = host.split(".");
    let suffix = labels[labels.length - 1];
    for (let i = 1; i < labels.length; i++) {
      const cand = labels.slice(i).join(".");
      if (SUFFIXES.has(cand)) { suffix = cand; break; }
    }
    const nSuffix = suffix.split(".").length;
    const domLabel = isIp ? "" : labels[labels.length - nSuffix - 1] || "";
    let path = u.pathname;
    try { path = decodeURIComponent(path); } catch {}
    return {
      input: input.trim(), href: u.href, host, hostUnicode: toUnicode(host), isIp,
      sub: isIp ? "" : labels.slice(0, Math.max(0, labels.length - nSuffix - 1)).join("."),
      domLabel, suffix, tld: labels[labels.length - 1],
      regDomain: isIp || !domLabel ? host : `${domLabel}.${suffix}`,
      path: path === "/" ? "" : path, query: u.search, port: u.port,
      hasUserInfo: Boolean(u.username || u.password),
    };
  }

  // ---------- Tiện ích ----------
  function editDistance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function entropy(s) {
    const f = {};
    [...s].forEach((c) => (f[c] = (f[c] || 0) + 1));
    return Object.values(f).reduce((h, n) => h - (n / s.length) * Math.log2(n / s.length), 0);
  }
  const endsWithDomain = (host, d) => host === d || host.endsWith("." + d);

  // ---------- Phân tích ----------
  function analyze(input, opts = {}) {
    const p = parse(input);
    if (!p) return { valid: false };
    const reasons = [];
    const add = (id, group, value, text) => reasons.push({ id, group, value, text });

    // Trang người dùng tự tạo (sites.google.com…) không được hưởng độ tin cậy của tên miền gốc.
    const userContent = USER_CONTENT_HOSTS.some((h) => endsWithDomain(p.host, h));
    const official = userContent ? null : OFFICIAL.get(p.regDomain);
    const domLabelU = toUnicode(p.domLabel);

    // Danh sách đen / báo cáo cộng đồng
    if ((opts.blacklist || []).some((d) => endsWithDomain(p.host, d)))
      add("blacklisted", "Danh sách", 8, "Tên miền nằm trong danh sách đã bị báo cáo lừa đảo.");

    // Whitelist
    if (official)
      add("official_domain", "Danh sách", -9, `Tên miền chính thức của ${official.name}.`);
    else if (/^(gov|edu)\.vn$/.test(p.suffix))
      add("gov_edu_vn", "F1", -1, `Đuôi .${p.suffix} chỉ cơ quan, trường học mới đăng ký được.`);

    // F1 – cấu trúc
    if (p.isIp) add("host_is_ip", "F1", 3, "Dùng địa chỉ IP thay cho tên miền.");
    if (p.hasUserInfo) add("at_symbol", "F1", 2.5, "Có ký tự “@” trước tên miền – thủ thuật che giấu trang đích thật.");
    if (TLD_RISK[p.tld]) add("tld_risk", "F1", TLD_RISK[p.tld], `Đuôi “.${p.tld}” thường bị lạm dụng cho trang lừa đảo.`);
    if (SHORTENERS.includes(p.regDomain)) add("shortener", "F1", 2.5, "Link rút gọn – không thấy được trang đích thật.");
    if (HOSTING_PLATFORMS.includes(p.suffix))
      add("free_hosting", "F1", 1.2, `Trang tự tạo trên nền tảng miễn phí (${p.suffix}).`);
    if (userContent) add("user_content", "F1", 1.5, `Trang do người dùng tự tạo trên ${p.host}, không phải trang của Google.`);
    const subDepth = p.sub ? p.sub.split(".").length : 0;
    if (subDepth >= 3) add("deep_subdomain", "F1", 1, `Có ${subDepth} cấp tên miền phụ lồng nhau.`);
    if (/(^|\.)(com|net|org|gov|edu)(\.vn)?$/.test(p.sub) && subDepth >= 2)
      add("domain_in_subdomain", "F1", 1.2, `Tên miền phụ “${p.sub}” giả dạng một tên miền hoàn chỉnh.`);
    const hyphens = (domLabelU.match(/-/g) || []).length;
    if (hyphens >= 2) add("many_hyphens", "F1", 0.8, `Tên miền chính có ${hyphens} dấu gạch ngang.`);
    const digits = (domLabelU.match(/\d/g) || []).length;
    if (domLabelU.length > 5 && digits / domLabelU.length > 0.3) add("digit_ratio", "F1", 0.6, "Tên miền chứa nhiều chữ số.");
    if (p.host.length > 35) add("long_host", "F1", 0.6, `Tên miền dài bất thường (${p.host.length} ký tự).`);
    if (!p.isIp && domLabelU.length >= 10 && entropy(domLabelU) > 3.5 && !segment(stripVi(domLabelU).replace(/[^a-z0-9]/g, "")).some((x) => x.known))
      add("random_host", "F1", 0.6, "Tên miền trông như chuỗi ký tự ngẫu nhiên.");
    if (p.port && !["80", "443"].includes(p.port)) add("odd_port", "F1", 0.8, `Dùng cổng lạ (:${p.port}).`);
    if (p.input.length > 120) add("long_url", "F1", 0.4, `Đường link rất dài (${p.input.length} ký tự).`);
    if (/https?(:|%3a)|www\./i.test(p.path + p.query)) add("embedded_url", "F1", 0.6, "Đường dẫn chứa một link khác (có thể chuyển hướng).");

    // F2 – token theo vị trí
    const tokens = [...tokenize(p.sub, "sub"), ...tokenize(p.domLabel, "dom"), ...tokenize(p.path + " " + p.query, "path")];
    const seenKw = new Set();
    tokens.forEach((tk) => {
      const kw = KEYWORDS.get(tk.t);
      if (!tk.known || !kw || seenKw.has(tk.pos + kw.k) || official) return;
      seenKw.add(tk.pos + kw.k);
      add(`${tk.pos}:${kw.k}`, "F2", +(kw.w * POS_WEIGHT[tk.pos]).toFixed(2), `${POS_NAME[tk.pos][0].toUpperCase() + POS_NAME[tk.pos].slice(1)} chứa từ khoá “${kw.t}”.`);
    });

    // F4 – giả mạo thương hiệu
    if (!official && !p.isIp) {
      const brandHits = new Map();
      tokens.forEach((tk) => {
        const b = tk.known && BRAND_KEYS.get(tk.t);
        if (!b || b === OFFICIAL.get(p.regDomain) || (tk.t.length <= 4 && !tk.isolated)) return;
        const order = { dom: 3, sub: 2, path: 1 };
        if (!brandHits.has(b) || order[tk.pos] > order[brandHits.get(b)]) brandHits.set(b, tk.pos);
      });
      brandHits.forEach((pos, b) => {
        const off = b.domains[0];
        if (pos === "path") add("brand_in_path", "F4", 1.2, `Đường dẫn nhắc tới ${b.name} nhưng trang không thuộc ${off}.`);
        else add("brand_outside_regdomain", "F4", 3.5, `Tên ${b.name} xuất hiện ở ${POS_NAME[pos]}, nhưng tên miền chính lại là “${p.regDomain}” (trang thật: ${off}).`);
      });

      // Ký tự giống nhau / gõ sai chính tả thương hiệu (typosquatting)
      const uni = stripVi(p.hostUnicode).split(".");
      const nSuffix = p.suffix.split(".").length;
      const chunks = uni.slice(0, uni.length - nSuffix).flatMap((l) => l.split("-")).filter((c) => c.length >= 4);
      let squat = null;
      chunks.forEach((c) => {
        const plain = unLookalike(c);
        BRANDS_VN.forEach((b) => b.keys.forEach((k) => {
          if (k.length < 4 || brandHits.has(b) || squat) return;
          if (plain !== c && plain === k) squat = { b, c, kind: "lookalike" };
          else if (k.length >= 6 && c !== k) {
            const d = editDistance(plain, k);
            if (d >= 1 && d <= (k.length >= 9 ? 2 : 1)) squat = { b, c, kind: "typo" };
          }
        }));
      });
      if (squat?.kind === "lookalike")
        add("homoglyph", "F4", 4.5, `“${squat.c}” dùng ký tự trông giống chữ cái để giả “${squat.b.keys[0]}” (${squat.b.name}).`);
      else if (squat)
        add("typosquat", "F4", 3.5, `“${squat.c}” viết gần giống “${squat.b.keys[0]}” (${squat.b.name}) – kiểu gõ sai cố ý.`);
    }
    if (p.host.includes("xn--"))
      add("punycode", "F4", 2, `Tên miền dùng ký tự quốc tế (punycode), hiển thị thật là “${p.hostUnicode}”.`);

    // Tổng hợp
    reasons.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    const logit = BIAS + reasons.reduce((s, r) => s + r.value, 0);
    const prob = 1 / (1 + Math.exp(-logit));
    const level = prob >= LEVELS.danger ? "danger" : prob >= LEVELS.warn ? "warn" : "safe";
    return { valid: true, parsed: p, tokens, reasons, bias: BIAS, prob, score: Math.round(prob * 100), level, label: level === "safe" ? "safe" : "scam" };
  }

  return { analyze, parse, segment, toUnicode, LEVELS };
})();

if (typeof module !== "undefined") module.exports = UrlAnalyzer;
