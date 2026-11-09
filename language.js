/* ============================================================================
   QUẢN LÝ SONG NGỮ VI / EN
   ----------------------------------------------------------------------------
   1. DICTIONARY chứa mọi chuỗi giao diện và chú thích của báo cáo.
   2. Không tác động vào điểm số hay thuật toán của url-analyzer.js.
   3. Khi đổi ngôn ngữ, nội dung HTML tĩnh và kết quả quét đều được vẽ lại.
   4. Chỉ lưu mã ngôn ngữ trong localStorage, KHÔNG lưu URL người dùng quét.
   ============================================================================ */

const Language = (() => {
  const KEY = 'scamshield_language';
  const DICTIONARY = {
    vi: {
      pageTitle: 'ScamShield-AI – Phòng chống lừa đảo trực tuyến',
      metaDescription: 'Quét URL và xem báo cáo rủi ro dựa trên cấu trúc, từ khóa và dấu hiệu giả mạo.',
      homeLink: 'Quét URL',
      systemStatus: 'Hệ thống đang hoạt động · phân tích ngay trên trình duyệt',
      heroTitle: 'Quét trước khi <span class="glow">tin</span>.<br>Kiểm tra trước khi <span class="glow">chuyển tiền</span>.',
      heroLead: 'Dán đường link. ScamShield tách cấu trúc, chấm điểm rủi ro và cho bạn biết <em>vì sao</em>.',
      websiteTab: 'Website',
      scanButton: 'Quét',
      inputPlaceholder: 'Ví dụ: https://vietcombank-xacthuc.top/login',
      quickTry: 'Thử nhanh:',
      statPhishVN: 'bản ghi URL bối cảnh Việt Nam (PhishVN)',
      statPhiUSIIL: 'URL lừa đảo & hợp lệ quốc tế (PhiUSIIL)',
      statBrands: 'thương hiệu được giám sát giả mạo',
      statKeywords: 'từ khoá lừa đảo trong từ điển',
      statSources: 'Nguồn dữ liệu: PhishVN – Mendeley Data v4 (CC BY 4.0) · PhiUSIIL – UCI #967 (CC BY 4.0)',
      footerDescription: 'Quét đường link và xem những dấu hiệu rủi ro được phát hiện – kèm giải thích vì sao.',
      footerStatus: 'Phân tích ngay trên trình duyệt',
      footerNote: 'Đây là công cụ phân tích heuristic chạy trên trình duyệt. Danh sách đen là dữ liệu mẫu; kết quả không phải xác minh an toàn hoặc dự đoán từ mô hình AI đã huấn luyện.',
      footerCopyright: 'Dự án nhóm (group project)',
      footerSources: 'Nguồn tham khảo: PhishVN, PhiUSIIL (CC BY 4.0).',
      footerTop: 'Lên đầu trang',
      invalidTitle: 'Đường link không hợp lệ',
      invalidReason: 'Vui lòng kiểm tra lại định dạng, ví dụ: tenmien.vn/duong-dan.',
      dangerTitle: 'NGUY HIỂM – Nhiều dấu hiệu lừa đảo',
      warnTitle: 'ĐÁNG NGỜ – Cần thận trọng',
      safeTitle: 'AN TOÀN – Chưa thấy dấu hiệu bất thường',
      targetLabel: 'Đối tượng',
      subdomain: 'tên miền phụ',
      mainDomain: 'tên miền chính',
      suffix: 'đuôi',
      path: 'đường dẫn',
      ip: 'địa chỉ IP',
      realDisplay: 'Hiển thị thật',
      scoreLabel: 'Điểm rủi ro ước tính',
      whyTitle: 'Vì sao có kết quả này?',
      noSignals: 'Không phát hiện đặc trưng bất thường nào. Kết quả không đảm bảo an toàn tuyệt đối – hãy kiểm tra kỹ trước khi nhập thông tin.',
      contributionsLegend: 'Thanh đỏ đẩy về phía lừa đảo, thanh xanh đẩy về phía an toàn. F1: cấu trúc · F2: từ khoá theo vị trí · F4: giả mạo thương hiệu.',
      resultDisclaimer: 'Kết quả dựa trên các quy tắc phân tích cục bộ và dữ liệu minh họa; điểm số không phải xác suất do mô hình AI đã huấn luyện dự đoán.',
      referenceGroup: 'Danh sách',
      languageLabel: 'Chọn ngôn ngữ',
    },
    en: {
      pageTitle: 'ScamShield-AI – Online scam URL scanner',
      metaDescription: 'Scan a URL and view risk indicators based on its structure, keywords, and impersonation signals.',
      homeLink: 'Scan URL',
      systemStatus: 'System online · analysis runs in your browser',
      heroTitle: 'Scan before you <span class="glow">trust</span>.<br>Check before you <span class="glow">pay</span>.',
      heroLead: 'Paste a URL. ScamShield examines its structure, estimates a risk score, and explains <em>why</em>.',
      websiteTab: 'Website',
      scanButton: 'Scan',
      inputPlaceholder: 'Example: https://vietcombank-xacthuc.top/login',
      quickTry: 'Quick samples:',
      statPhishVN: 'Vietnamese-context URL records (PhishVN)',
      statPhiUSIIL: 'international phishing & legitimate URLs (PhiUSIIL)',
      statBrands: 'brands monitored for impersonation',
      statKeywords: 'scam keywords in the dictionary',
      statSources: 'Data references: PhishVN – Mendeley Data v4 (CC BY 4.0) · PhiUSIIL – UCI #967 (CC BY 4.0)',
      footerDescription: 'Scan suspicious links and see the detected risk indicators, with explanations.',
      footerStatus: 'Analysis runs locally in your browser',
      footerNote: 'This is a browser-based, rule-driven analysis demo. Its blocklist contains sample entries; results do not verify safety and are not predictions from a trained AI model.',
      footerCopyright: 'Student group project',
      footerSources: 'References: PhishVN, PhiUSIIL (CC BY 4.0).',
      footerTop: 'Back to top',
      invalidTitle: 'Invalid URL',
      invalidReason: 'Please check the URL format, for example: example.com/path.',
      dangerTitle: 'DANGEROUS – Multiple scam indicators',
      warnTitle: 'SUSPICIOUS – Proceed with caution',
      safeTitle: 'LOW RISK – No unusual indicators detected',
      targetLabel: 'Target',
      subdomain: 'subdomain',
      mainDomain: 'main domain',
      suffix: 'suffix',
      path: 'path',
      ip: 'IP address',
      realDisplay: 'Actual display',
      scoreLabel: 'Estimated risk score',
      whyTitle: 'Why did you get this result?',
      noSignals: 'No unusual indicators were found. This does not guarantee safety. Always verify the website before entering personal information.',
      contributionsLegend: 'Red bars increase the scam risk estimate; green bars reduce it. F1: structure · F2: position-based keywords · F4: brand impersonation.',
      resultDisclaimer: 'This score is based on local heuristic rules and sample data; it is not a probability predicted by a trained AI model.',
      referenceGroup: 'Reference list',
      languageLabel: 'Select language',
    },
  };

  let current = 'vi';
  const callbacks = [];
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'en' || stored === 'vi') current = stored;
  } catch { /* Trình duyệt có thể hạn chế localStorage; vẫn mặc định tiếng Việt. */ }

  // Lấy chuỗi đúng theo ngôn ngữ. Nếu không có, sử dụng bản tiếng Việt.
  function t(key) {
    return DICTIONARY[current][key] ?? DICTIONARY.vi[key] ?? key;
  }

  // Đồng bộ các phần tử mang data-i18n / data-i18n-html / data-i18n-placeholder.
  // HTML động chỉ lấy từ DICTIONARY cố định (không chèn nội dung người dùng).
  function apply() {
    document.documentElement.lang = current;
    document.title = t('pageTitle');
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    document.querySelectorAll('[data-i18n-content]').forEach(el => { el.setAttribute('content', t(el.dataset.i18nContent)); });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel)));
    document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); el.setAttribute('aria-label', t(el.dataset.i18nTitle)); });
    document.querySelectorAll('[data-lang]').forEach(el => {
      const active = el.dataset.lang === current;
      el.setAttribute('aria-pressed', String(active));
    });
    // Cho phép module scan.js vẽ lại báo cáo đã quét khi đổi ngôn ngữ.
    callbacks.forEach(callback => callback(current));
  }

  function set(lang) {
    if (lang !== 'vi' && lang !== 'en') return;
    current = lang;
    try { localStorage.setItem(KEY, lang); } catch { /* Trình duyệt khóa lưu trữ. */ }
    apply();
  }
  function get() { return current; }
  function onChange(callback) { callbacks.push(callback); }

  // Dịch tên vị trí, áp dụng trong phần giải thích các tín hiệu F2/F4.
  function position(name) {
    if (current === 'vi') return name;
    return ({'tên miền phụ': 'subdomain', 'tên miền chính': 'main domain', 'đường dẫn': 'URL path'})[name] || name;
  }

  /* Dịch lý do ĐỘNG do bộ phân tích tạo ra.
     Mỗi lý do có id cố định, nên dịch theo id để không làm thay đổi thuật toán.
     Các trường động như domain, tên thương hiệu và số đếm được giữ nguyên. */
  function reason(item, parsed) {
    if (current === 'vi') return item.text;
    const id = item.id;
    const p = parsed;
    const quoted = [...item.text.matchAll(/“([^”]*)”/g)].map(m => m[1]);
    const number = n => Number.isFinite(n) ? n : '?';
    switch (id) {
      case 'blacklisted': return 'The hostname appears in a sample list of reported scam sites.';
      case 'official_domain': {
        const brand = /^Tên miền chính thức của (.+)\.$/.exec(item.text)?.[1] || 'a monitored organization';
        return `Official domain of ${brand}.`;
      }
      case 'gov_edu_vn': return `The .${p.suffix} suffix is restricted to eligible government or educational organizations.`;
      case 'host_is_ip': return 'Uses an IP address instead of a domain name.';
      case 'at_symbol': return 'Contains an “@” character before the hostname, which may conceal the real destination.';
      case 'tld_risk': return `The “.${p.tld}” suffix is frequently abused in phishing links.`;
      case 'shortener': return 'Shortened link: the final destination is not visible in the URL.';
      case 'free_hosting': return `User-created page hosted on a free platform (${p.suffix}).`;
      case 'user_content': return `A user-created page hosted at ${p.host}; it is not automatically an official Google page.`;
      case 'deep_subdomain': return `Contains ${number(p.sub ? p.sub.split('.').length : 0)} nested subdomain levels.`;
      case 'domain_in_subdomain': return `The subdomain “${p.sub}” imitates a complete domain name.`;
      case 'many_hyphens': return `The main domain label contains ${(p.domLabel.match(/-/g) || []).length} hyphens.`;
      case 'digit_ratio': return 'The domain name contains an unusually high proportion of digits.';
      case 'long_host': return `Unusually long hostname (${p.host.length} characters).`;
      case 'random_host': return 'The hostname resembles a random string.';
      case 'odd_port': return `Uses an unusual network port (:${p.port}).`;
      case 'long_url': return `Very long URL (${p.input.length} characters).`;
      case 'embedded_url': return 'The URL path contains another URL, possibly used for redirection.';
      case 'brand_in_path': {
        const match = /^Đường dẫn nhắc tới (.+) nhưng trang không thuộc (.+)\.$/.exec(item.text);
        return match ? `The path mentions ${match[1]}, but the site is not hosted at ${match[2]}.` : item.text;
      }
      case 'brand_outside_regdomain': {
        const match = /^Tên (.+) xuất hiện ở (tên miền phụ|tên miền chính|đường dẫn), nhưng tên miền chính lại là “(.+)” \(trang thật: (.+)\)\.$/.exec(item.text);
        return match ? `${match[1]} appears in the ${position(match[2])}, but the registrable domain is “${match[3]}” (official site: ${match[4]}).` : item.text;
      }
      case 'homoglyph': return `“${quoted[0] || p.domLabel}” uses lookalike characters to imitate “${quoted[1] || 'a brand'}”.`;
      case 'typosquat': return `“${quoted[0] || p.domLabel}” closely resembles “${quoted[1] || 'a brand'}” — a possible typosquatting attempt.`;
      case 'punycode': return `The hostname uses internationalized characters (punycode); the Unicode display is “${p.hostUnicode}”.`;
      default: {
        // Các tín hiệu từ khóa F2 có id sub:..., dom:... hoặc path:...
        const match = /^(sub|dom|path):/.exec(id);
        if (match) {
          const label = {sub: 'Subdomain', dom: 'Main domain', path: 'URL path'}[match[1]];
          return `${label} contains the keyword “${quoted[0] || id.slice(match[0].length)}”.`;
        }
        // Khi bổ sung quy tắc mới, không tự động suy diễn diễn giải tiếng Anh.
        return `Rule ${id} was evaluated; review the original Vietnamese explanation.`;
      }
    }
  }

  function group(label) { return current === 'en' && label === 'Danh sách' ? t('referenceGroup') : label; }
  return { t, get, set, apply, onChange, reason, group };
})();
