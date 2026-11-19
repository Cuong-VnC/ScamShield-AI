// Bộ phân tích cấu trúc URL chạy cục bộ. Nạp dictionaries.js trước khi phân tích.

const UrlAnalyzer = (() => {
  const POS_WEIGHT = { sub: 1.0, dom: 1.4, path: 0.7 };
  const SUFFIXES = new Set([...PUBLIC_SUFFIXES, ...HOSTING_PLATFORMS]);
  const KEYWORDS = new Map(SCAM_KEYWORDS.map((x) => [x.k, x]));
  const BRAND_KEYS = new Map();
  BRANDS_VN.forEach((b) => b.keys.forEach((k) => BRAND_KEYS.set(k, b)));
  const DICT = new Set([...KEYWORDS.keys(), ...BRAND_KEYS.keys(), ...COMMON_WORDS]);
  const MAX_WORD = Math.max(...[...DICT].map((w) => w.length));
  const BRAND_DOMAINS = new Map();
  BRANDS_VN.forEach((b) => b.domains.forEach((d) => BRAND_DOMAINS.set(d, b)));

  // Ký tự dễ nhầm: số thay chữ (vietc0mbank) và chữ Cyrillic/Hy Lạp trông giống Latin.
  const LOOKALIKE = { 0: "o", 1: "l", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b",
    "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y", "і": "i", "ј": "j", "ѕ": "s", "ԁ": "d", "ο": "o", "α": "a", "ν": "v" };
  const unLookalike = (s) => [...s].map((c) => LOOKALIKE[c] ?? c).join("").replace(/rn/g, "m").replace(/vv/g, "w");
  const stripVi = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

  // ---------- Punycode (RFC 3492) ----------
  function punyDecode(input) {
    const base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700;
    const adapt = (delta, num, first) => {
      delta = first ? Math.floor(delta / damp) : Math.floor(delta / 2);
      delta += Math.floor(delta / num);
      let k = 0;
      while (delta > Math.floor(((base - tMin) * tMax) / 2)) { delta = Math.floor(delta / (base - tMin)); k += base; }
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
    if (typeof input !== "string" || /[\u0000-\u001f\u007f-\u009f]/u.test(input)) return null;
    const raw = input.trim();
    if (!raw || raw.length > 2048 || /[\s\\<>"'\uD800-\uDFFF]/u.test(raw)) return null;

    const schemePrefix = /^https?:\/\//i.exec(raw)?.[0];
    const bareHostWithPort = /^[^:/?#@]+\.[^:/?#@]+:\d+(?:[/?#]|$)/u.test(raw);
    if (!schemePrefix && /^[a-z][a-z0-9+.-]*:/i.test(raw) && !bareHostWithPort) return null;
    const candidate = schemePrefix ? raw : "http://" + raw;
    // Use URL for validation, but keep the original path, query and explicit port.
    const authority = /^https?:\/\/([^/?#]+)(.*)$/iu.exec(candidate);
    if (!authority) return null;
    const hostAndPort = /^(\[[^\]]+\]|[^:]+)(?::(\d+))?$/u.exec(authority[1].split("@").at(-1));
    if (!hostAndPort || hostAndPort[1].includes("%")) return null;
    const [, rawHost, rawPort] = hostAndPort;
    if (rawPort && (+rawPort < 1 || +rawPort > 65535)) return null;

    let url;
    try { url = new URL(candidate); } catch { return null; }
    const host = url.hostname;
    const dnsName = host.replace(/\.$/, "");
    const ipv6 = host.startsWith("[");
    const ipv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    if (ipv4 && rawHost !== host) return null; // Avoid alternative IPv4 forms.
    const isIp = ipv4 || ipv6;
    const labels = isIp ? [] : dnsName.split(".");
    if (!isIp && (host.length > 253 || labels.length < 2 ||
        labels.some((label) => !/^[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?$/i.test(label)))) return null;

    let suffix = "";
    for (let i = 1; i < labels.length; i++) {
      const candidateSuffix = labels.slice(i).join(".");
      if (SUFFIXES.has(candidateSuffix)) { suffix = candidateSuffix; break; }
    }
    const domainIndex = suffix ? labels.length - suffix.split(".").length - 1 : -1;
    const domLabel = labels[domainIndex] || "";
    const hasUserInfo = authority[1].includes("@");
    // The Backend expects an ASCII hostname. Convert only an IDN host.
    let requestUrl = /[^\x00-\x7f]/u.test(rawHost)
      ? (schemePrefix || "") + host + (rawPort ? ":" + rawPort : "") + authority[2] : raw;
    if (requestUrl.length > 2048) return null;
    if (hasUserInfo) requestUrl = null;
    const pathQuery = authority[2].split("#", 1)[0];
    const queryStart = pathQuery.indexOf("?");
    const path = queryStart < 0 ? pathQuery : pathQuery.slice(0, queryStart);
    return {
      host, dnsName, hostUnicode: toUnicode(host), isIp, scheme: url.protocol.slice(0, -1),
      sub: domainIndex > 0 ? labels.slice(0, domainIndex).join(".") : "",
      domLabel, suffix, tld: labels.at(-1) || "",
      regDomain: domLabel ? domLabel + "." + suffix : null,
      path: path === "/" ? "" : path, query: queryStart < 0 ? "" : pathQuery.slice(queryStart),
      port: rawPort ? String(Number(rawPort)) : "", hasUserInfo, requestUrl,
      inputLength: raw.length, comparisonUrl: requestUrl ? url.href : null,
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
  function analyze(input) {
    const p = parse(input);
    if (!p) return { valid: false };
    const reasons = [];
    const add = (id, group, value, details = {}) => reasons.push({ id, group, value, ...details });
    const platform = HOSTING_PLATFORMS.find((host) => p.dnsName.endsWith("." + host));
    const userContent = USER_CONTENT_HOSTS.find((host) => endsWithDomain(p.dnsName, host));
    const reference = !platform && !userContent ? BRAND_DOMAINS.get(p.regDomain) : null;
    const domLabelU = toUnicode(p.domLabel);

    if (reference) add("brand_reference", "F4", 0, { brand: reference.name });
    if (p.isIp) add("host_is_ip", "F1", 3);
    if (p.scheme === "http") add("no_https", "F1", 0.7);
    if (p.hasUserInfo) add("at_symbol", "F1", 2.5);
    if (TLD_RISK.has(p.tld)) add("tld_risk", "F1", 0.3);
    if (SHORTENERS.includes(p.dnsName)) add("shortener", "F1", 2.5);
    if (platform || userContent) add("user_content", "F1", 0.4, { platform: platform || userContent });
    const subDepth = p.sub ? p.sub.split(".").length : 0;
    if (subDepth >= 3) add("deep_subdomain", "F1", 1, { count: subDepth });
    if (/(^|\.)(com|net|org|gov|edu)(\.vn)?$/.test(p.sub) && subDepth >= 2)
      add("domain_in_subdomain", "F1", 1.2);
    const hyphens = (domLabelU.match(/-/g) || []).length;
    if (hyphens >= 2) add("many_hyphens", "F1", 0.8, { count: hyphens });
    const digits = (domLabelU.match(/\d/g) || []).length;
    if (domLabelU.length > 5 && digits / domLabelU.length > 0.3) add("digit_ratio", "F1", 0.6);
    if (!p.isIp && p.host.length > 35) add("long_host", "F1", 0.6, { count: p.host.length });
    if (domLabelU.length >= 10 && entropy(domLabelU) > 3.5 &&
        !segment(stripVi(domLabelU).replace(/[^a-z0-9]/g, "")).some((x) => x.known))
      add("random_host", "F1", 0.6);
    if (p.port && !["80", "443"].includes(p.port)) add("odd_port", "F1", 0.8);
    if (p.inputLength > 120) add("long_url", "F1", 0.4, { count: p.inputLength });
    let pathQuery = p.path + " " + p.query;
    try { pathQuery = decodeURIComponent(pathQuery); } catch {}
    if (/https?(:|%3a)|www\./i.test(pathQuery)) add("embedded_url", "F1", 0.6);

    const tokens = [
      ...tokenize(toUnicode(p.sub), "sub"), ...tokenize(domLabelU, "dom"),
      ...tokenize(pathQuery, "path"),
    ];
    const seenKw = new Set();
    for (const token of tokens) {
      const kw = KEYWORDS.get(token.t);
      const id = token.pos + ":" + token.t;
      if (!token.known || !kw || seenKw.has(id)) continue;
      seenKw.add(id);
      add(id, "F2", kw.w * POS_WEIGHT[token.pos], { position: token.pos, keyword: kw.t, term: kw.k });
    }

    // Compare brands only when the local suffix list recognizes the domain boundary.
    if (p.regDomain) {
      const brandHits = new Map();
      const positionRank = { dom: 3, sub: 2, path: 1 };
      for (const token of tokens) {
        const brand = token.known && BRAND_KEYS.get(token.t);
        if (!brand || brand === reference || (token.t.length <= 4 && !token.isolated)) continue;
        if (!brandHits.has(brand) || positionRank[token.pos] > positionRank[brandHits.get(brand)])
          brandHits.set(brand, token.pos);
      }
      for (const [brand, pos] of brandHits) {
        add(pos === "path" ? "brand_in_path" : "brand_outside_regdomain", "F4",
            pos === "path" ? 0.8 : 3.5,
            { brand: brand.name, position: pos, referenceDomain: brand.domains[0] });
      }

      const chunks = stripVi([toUnicode(p.sub), domLabelU].filter(Boolean).join("."))
        .split(/[.-]/).filter((label) => label.length >= 4);
      for (const chunk of chunks) {
        const plain = unLookalike(chunk);
        let match = null;
        for (const brand of BRANDS_VN) {
          if (brand === reference || brandHits.has(brand)) continue;
          for (const key of brand.keys) {
            if (key.length < 4) continue;
            if (plain !== chunk && plain === key)
              match = { id: "homoglyph", brand: brand.name, term: key, observed: chunk };
            else if (!match && key.length >= 6 && key !== plain && Math.abs(plain.length - key.length) <= 1 &&
                     editDistance(plain, key) === 1)
              match = { id: "typosquat", brand: brand.name, term: key, observed: chunk };
          }
        }
        if (match) {
          add(match.id, "F4", match.id === "homoglyph" ? 4.5 : 3, match);
          break;
        }
      }
    }
    if (p.dnsName.split(".").some((label) => label.startsWith("xn--")))
      add("punycode", "F4", 0);

    reasons.sort((a, b) => b.value - a.value);
    const riskSignalScore = Math.round(reasons.reduce((sum, signal) => sum + signal.value, 0) * 100) / 100;
    return { valid: true, parsed: p, reasons, riskSignalScore, hasRiskSignals: riskSignalScore >= 2 };
  }

  return { analyze, parse };
})();

if (typeof module !== "undefined") module.exports = UrlAnalyzer;
