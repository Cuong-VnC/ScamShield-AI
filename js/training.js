// Trang đào tạo: khoá học 6 bài + bài kiểm tra cuối khoá + chứng nhận.
// Điều hướng bằng hash: #/ (tổng quan) · #/bai/N · #/kiem-tra · #/chung-nhan
// Tiến độ lưu trên trình duyệt (localStorage) dưới khoá "scamshield_training".

const KEY = "scamshield_training";
const app = $("#training-app");
const loadProgress = () => store.get(KEY, { lessons: {}, exam: null });
const saveProgress = (p) => store.set(KEY, p);
const pad = (n) => String(n).padStart(2, "0");
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
// Trộn thứ tự đáp án để người học không đoán theo vị trí.
const shuffleOptions = (q) => {
  const order = shuffle(q.options.map((_, k) => k));
  return { ...q, options: order.map((k) => q.options[k]), answer: order.indexOf(q.answer) };
};

// ---------- Router ----------
function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const m = h.match(/^bai\/(\d+)$/);
  if (m && LESSONS.some((l) => l.id === +m[1])) renderLesson(+m[1]);
  else if (h === "kiem-tra") renderExamIntro();
  else if (h === "chung-nhan") renderCertificate();
  else renderOverview();
  window.scrollTo({ top: 0, behavior: "instant" });
  initReveal(app);
}
window.addEventListener("hashchange", route);

// ---------- Tổng quan ----------
function renderOverview() {
  const p = loadProgress();
  const done = LESSONS.filter((l) => p.lessons[l.id]?.done).length;
  const pct = Math.round((done / LESSONS.length) * 100);
  const next = LESSONS.find((l) => !p.lessons[l.id]?.done);
  const exam = p.exam;
  const C = 2 * Math.PI * 52;

  const lessonCards = LESSONS.map((l) => {
    const st = p.lessons[l.id];
    const status = st?.done
      ? `<span class="status done">✓ Đã học · ${st.score}/${st.total}</span>`
      : `<span class="status">Chưa học</span>`;
    return `<a class="card lesson-card reveal${st?.done ? " is-done" : ""}" href="#/bai/${l.id}">
      <div class="lesson-top"><span class="lesson-num mono">BÀI ${pad(l.id)}</span><span class="lesson-icon">${l.icon}</span></div>
      <h3>${l.title}</h3>
      <p>${l.summary}</p>
      <div class="meta"><span>⏱ ${l.minutes} phút · ${l.quiz.length} câu hỏi</span>${status}</div>
    </a>`;
  }).join("");

  const examBody = exam?.passed
    ? `<p>Bạn đã đạt <b>${exam.best}/${exam.total}</b> và nhận chứng nhận. Có thể làm lại để cải thiện điểm.</p>
       <div class="exam-actions"><a class="btn btn-primary" href="#/chung-nhan">🎓 Xem chứng nhận</a><a class="btn btn-ghost" href="#/kiem-tra">Làm lại bài kiểm tra</a></div>`
    : `<p>${EXAM_SIZE} câu tình huống chọn ngẫu nhiên từ toàn khoá. Đạt từ ${Math.round(PASS_RATE * 100)}% để nhận chứng nhận.
       ${done < LESSONS.length ? `<br><span class="muted small">Nên hoàn thành ${LESSONS.length} bài học trước khi làm bài (đã học ${done}/${LESSONS.length}).</span>` : ""}
       ${exam ? `<br><span class="muted small">Điểm cao nhất: ${exam.best}/${exam.total}</span>` : ""}</p>
       <div class="exam-actions"><a class="btn btn-primary" href="#/kiem-tra">Làm bài kiểm tra →</a></div>`;

  const badges = [
    ...LESSONS.map((l) => ({ icon: l.icon, label: `Bài ${l.id}`, title: l.title, on: p.lessons[l.id]?.done })),
    { icon: "⭐", label: "Toàn điểm", title: "Đúng hết câu hỏi của cả 6 bài", on: LESSONS.every((l) => p.lessons[l.id]?.done && p.lessons[l.id].score === p.lessons[l.id].total) },
    { icon: "🎓", label: "Chứng nhận", title: "Đạt bài kiểm tra cuối khoá", on: exam?.passed },
    { icon: "💯", label: "Tuyệt đối", title: "Đạt 10/10 bài kiểm tra", on: exam && exam.best === exam.total },
  ];

  app.innerHTML = `
    <section class="training-hero">
      <div class="hero-grid" aria-hidden="true"></div>
      <div class="container training-hero-inner">
        <div>
          <p class="kicker mono">// Đào tạo</p>
          <h1>Khoá học phòng chống lừa đảo</h1>
          <p class="lead">${LESSONS.length} bài học ngắn, mỗi bài kèm ví dụ thật và câu hỏi tình huống. Hoàn thành bài kiểm tra cuối khoá để nhận chứng nhận.</p>
          <div class="hero-actions">
            ${next ? `<a class="btn btn-primary" href="#/bai/${next.id}">${done ? "Tiếp tục: " : "Bắt đầu: "}Bài ${next.id} →</a>` : `<a class="btn btn-primary" href="#/kiem-tra">Làm bài kiểm tra cuối khoá →</a>`}
            ${done || exam ? `<button class="btn btn-ghost" id="resetBtn">Học lại từ đầu</button>` : ""}
          </div>
        </div>
        <div class="progress-card panel">
          <svg class="ring" viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="52" class="ring-bg"/>
            <circle cx="60" cy="60" r="52" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}"/>
          </svg>
          <div class="ring-label"><b class="mono">${pct}%</b><span>${done}/${LESSONS.length} bài</span></div>
          <p class="small muted">Tiến độ được lưu trên trình duyệt này.</p>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head reveal"><div><p class="kicker mono">// Bài học</p><h2>Nội dung khoá học</h2></div></div>
        <div class="grid lessons-grid">${lessonCards}</div>

        <div class="exam-card panel spot reveal${exam?.passed ? " passed" : ""}">
          <div class="exam-icon">${exam?.passed ? "🎓" : "📝"}</div>
          <div><p class="kicker mono">// Kiểm tra cuối khoá</p><h2>Bài kiểm tra tổng hợp</h2>${examBody}</div>
        </div>

        <div class="reveal">
          <h3 class="badges-title">Huy hiệu của bạn</h3>
          <div class="badges">${badges.map((b) => `<div class="badge${b.on ? " on" : ""}" title="${b.title}"><span>${b.icon}</span><small>${b.label}</small></div>`).join("")}</div>
        </div>
      </div>
    </section>`;

  $("#resetBtn")?.addEventListener("click", () => {
    if (!confirm("Xoá toàn bộ tiến độ học, điểm và chứng nhận?")) return;
    saveProgress({ lessons: {}, exam: null });
    renderOverview();
    initReveal(app);
  });
}

// ---------- Bài học ----------
// Chuyển [[cụm từ|ghi chú]] thành dấu hiệu được đánh số.
function markExample(text) {
  const notes = [];
  const html = text.split(/(\[\[.+?\]\])/).map((part) => {
    const m = part.match(/^\[\[(.+?)\|(.+?)\]\]$/);
    if (!m) return esc(part);
    notes.push(m[2]);
    return `<mark class="flag" tabindex="0"><sup>${notes.length}</sup>${esc(m[1])}<span class="flag-note">${esc(m[2])}</span></mark>`;
  }).join("");
  return { html, notes };
}

function renderLesson(id) {
  const l = LESSONS.find((x) => x.id === id);
  const idx = LESSONS.indexOf(l);
  const prev = LESSONS[idx - 1], next = LESSONS[idx + 1];
  const ex = markExample(l.example.text);
  const channelIcon = { SMS: "💬", "Cuộc gọi": "📞", Email: "✉️", Telegram: "✈️", Messenger: "💭", Zalo: "💬" }[l.example.channel] || "💬";

  app.innerHTML = `
    <section class="section lesson">
      <div class="container narrow">
        <a href="#/" class="back">← Tất cả bài học</a>
        <div class="lesson-steps" aria-hidden="true">${LESSONS.map((x) => `<a href="#/bai/${x.id}" class="${x.id === id ? "current" : loadProgress().lessons[x.id]?.done ? "done" : ""}" title="Bài ${x.id}: ${x.title}"></a>`).join("")}</div>
        <p class="kicker mono">// Bài ${pad(l.id)} / ${pad(LESSONS.length)} · ⏱ ${l.minutes} phút</p>
        <h1 class="lesson-title"><span>${l.icon}</span>${l.title}</h1>
        <div class="lesson-intro">${l.intro.map((t) => `<p>${t}</p>`).join("")}</div>

        <h2 class="h-sub reveal">Ví dụ thực tế</h2>
        <p class="muted small reveal">Di chuột hoặc chạm vào các phần được tô đỏ để xem vì sao đó là dấu hiệu lừa đảo.</p>
        <div class="example reveal">
          <div class="phone panel">
            <div class="phone-head"><span class="ch">${channelIcon} ${l.example.channel}</span><b>${esc(l.example.from)}</b></div>
            <div class="bubble">${ex.html}</div>
          </div>
          <ol class="flag-list">${ex.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ol>
        </div>

        <div class="two-col">
          <div class="info-box danger-box reveal"><h3>🚩 Dấu hiệu nhận biết</h3><ul>${l.signs.map((s) => `<li>${s}</li>`).join("")}</ul></div>
          <div class="info-box safe-box reveal"><h3>🛡️ Cách phòng tránh</h3><ul>${l.tips.map((s) => `<li>${s}</li>`).join("")}</ul></div>
        </div>

        <h2 class="h-sub reveal">Kiểm tra nhanh</h2>
        <div class="quiz panel reveal" id="lessonQuiz"></div>

        <div class="lesson-nav">
          ${prev ? `<a class="btn btn-ghost" href="#/bai/${prev.id}">← Bài ${prev.id}</a>` : "<span></span>"}
          ${next ? `<a class="btn btn-ghost" href="#/bai/${next.id}">Bài ${next.id} →</a>` : `<a class="btn btn-ghost" href="#/kiem-tra">Bài kiểm tra →</a>`}
        </div>
      </div>
    </section>`;

  runQuiz($("#lessonQuiz"), l.quiz.map(shuffleOptions), {
    instant: true,
    onDone(score, total) {
      const p = loadProgress();
      const before = p.lessons[l.id];
      p.lessons[l.id] = { done: true, score: Math.max(score, before?.score || 0), total, at: Date.now() };
      saveProgress(p);
      const allDone = LESSONS.every((x) => p.lessons[x.id]?.done);
      const nextBtn = next
        ? `<a class="btn btn-primary" href="#/bai/${next.id}">Bài tiếp theo: ${next.title} →</a>`
        : `<a class="btn btn-primary" href="#/kiem-tra">Làm bài kiểm tra cuối khoá →</a>`;
      return `<div class="quiz-done">
        <div class="score-big mono">${score}/${total}</div>
        <p>${score === total ? "Xuất sắc! Bạn nắm rất chắc bài này." : "Bạn đã hoàn thành bài học. Xem lại phần giải thích để nhớ lâu hơn."}</p>
        ${allDone && next ? `<p class="small muted">Bạn đã học đủ ${LESSONS.length} bài – có thể làm bài kiểm tra cuối khoá.</p>` : ""}
        <div class="exam-actions center">${nextBtn}<button class="btn btn-ghost" data-retry>Làm lại</button></div>
      </div>`;
    },
  });
}

// ---------- Bộ câu hỏi dùng chung ----------
// instant: hiện đúng/sai + giải thích ngay sau mỗi câu (bài học); false: chỉ chấm ở cuối (bài kiểm tra).
function runQuiz(box, questions, { instant, onDone, onFinish }) {
  let i = 0, score = 0;
  const answers = [];

  function show() {
    if (i >= questions.length) {
      if (onFinish) return onFinish(score, answers);
      box.innerHTML = onDone(score, questions.length);
      $("[data-retry]", box)?.addEventListener("click", () => { i = 0; score = 0; answers.length = 0; show(); });
      return;
    }
    const q = questions[i];
    box.innerHTML = `
      <div class="quiz-bar"><span class="progress">Câu ${i + 1}/${questions.length}</span><span class="dots">${questions.map((_, k) => `<i class="${k < i ? "past" : k === i ? "now" : ""}"></i>`).join("")}</span></div>
      <div class="scenario">${esc(q.q)}</div>
      <div class="options">${q.options.map((o, k) => `<button class="opt" data-i="${k}"><span class="opt-key mono">${"ABCD"[k]}</span>${esc(o)}</button>`).join("")}</div>
      <div class="quiz-foot"></div>`;
    $$(".opt", box).forEach((b) => b.addEventListener("click", () => pick(+b.dataset.i)));
  }

  function pick(k) {
    const q = questions[i];
    const ok = k === q.answer;
    if (ok) score++;
    answers.push({ q, pick: k, ok });
    $$(".opt", box).forEach((x, n) => {
      x.disabled = true;
      if (instant && n === q.answer) x.classList.add("correct");
      else if (instant && n === k) x.classList.add("wrong");
      else if (!instant && n === k) x.classList.add("picked");
    });
    const last = i + 1 === questions.length;
    $(".quiz-foot", box).innerHTML = `
      ${instant ? `<div class="explain">${ok ? "✅ Chính xác! " : "❌ Chưa đúng. "}${esc(q.explain)}</div>` : ""}
      <div class="actions"><button class="btn btn-primary" data-next>${last ? (instant ? "Xem kết quả" : "Nộp bài") : "Câu tiếp theo →"}</button></div>`;
    $("[data-next]", box).addEventListener("click", () => { i++; show(); });
    $("[data-next]", box).focus();
  }

  show();
}

// ---------- Bài kiểm tra cuối khoá ----------
function buildExam() {
  const pool = [
    ...LESSONS.flatMap((l) => l.quiz.map((q) => ({ ...q, lesson: l.id }))),
    ...EXAM_EXTRA.map((q) => ({ ...q, lesson: null })),
  ];
  return shuffle(pool).slice(0, EXAM_SIZE).map(shuffleOptions);
}

function renderExamIntro() {
  const p = loadProgress();
  const done = LESSONS.filter((l) => p.lessons[l.id]?.done).length;
  app.innerHTML = `
    <section class="section">
      <div class="container narrow">
        <a href="#/" class="back">← Tất cả bài học</a>
        <p class="kicker mono">// Kiểm tra cuối khoá</p>
        <h1 class="lesson-title"><span>📝</span>Bài kiểm tra tổng hợp</h1>
        <div class="panel exam-intro">
          <ul class="exam-rules">
            <li><b class="mono">${EXAM_SIZE}</b><span>câu tình huống chọn ngẫu nhiên</span></li>
            <li><b class="mono">${Math.round(PASS_RATE * 100)}%</b><span>số câu đúng để đạt</span></li>
            <li><b class="mono">∞</b><span>không giới hạn thời gian, làm lại thoải mái</span></li>
          </ul>
          ${done < LESSONS.length ? `<p class="small muted">Bạn mới học ${done}/${LESSONS.length} bài. Bạn vẫn có thể làm bài, nhưng nên học đủ để đạt kết quả tốt.</p>` : ""}
          ${p.exam ? `<p class="small muted">Điểm cao nhất của bạn: ${p.exam.best}/${p.exam.total}</p>` : ""}
          <button class="btn btn-primary" id="startExam">Bắt đầu làm bài</button>
        </div>
      </div>
    </section>`;
  $("#startExam").addEventListener("click", startExam);
}

function startExam() {
  const questions = buildExam();
  app.innerHTML = `
    <section class="section">
      <div class="container narrow">
        <a href="#/" class="back">← Thoát bài kiểm tra</a>
        <p class="kicker mono">// Kiểm tra cuối khoá</p>
        <h1 class="lesson-title"><span>📝</span>Bài kiểm tra tổng hợp</h1>
        <div class="quiz panel" id="examQuiz"></div>
      </div>
    </section>`;
  runQuiz($("#examQuiz"), questions, { instant: false, onFinish: (score, answers) => renderExamResult(score, answers) });
}

function renderExamResult(score, answers) {
  const total = answers.length;
  const passed = score / total >= PASS_RATE;
  const p = loadProgress();
  const prev = p.exam || {};
  p.exam = { ...prev, best: Math.max(score, prev.best || 0), total, passed: prev.passed || passed, lastScore: score };
  saveProgress(p);

  const weak = [...new Set(answers.filter((a) => !a.ok && a.q.lesson).map((a) => a.q.lesson))].map((id) => LESSONS.find((l) => l.id === id));
  const review = answers.map((a, n) => `
    <details class="review ${a.ok ? "ok" : "bad"}">
      <summary><span class="mono">${pad(n + 1)}</span>${a.ok ? "✅" : "❌"} ${esc(a.q.q)}</summary>
      <p>Bạn chọn: <b>${esc(a.q.options[a.pick])}</b></p>
      ${a.ok ? "" : `<p>Đáp án đúng: <b>${esc(a.q.options[a.q.answer])}</b></p>`}
      <p class="muted">${esc(a.q.explain)}</p>
    </details>`).join("");

  app.innerHTML = `
    <section class="section">
      <div class="container narrow">
        <a href="#/" class="back">← Tất cả bài học</a>
        <div class="panel exam-result ${passed ? "pass" : "fail"}">
          <div class="score-big mono">${score}/${total}</div>
          <h2>${passed ? "🎉 Chúc mừng, bạn đã đạt!" : "Chưa đạt – cố gắng thêm nhé!"}</h2>
          <p class="muted">${passed ? "Bạn đã sẵn sàng nhận diện các chiêu trò lừa đảo phổ biến." : `Cần đúng ít nhất ${Math.ceil(total * PASS_RATE)}/${total} câu để đạt.`}</p>
          ${weak.length ? `<p class="small">Nên ôn lại: ${weak.map((l) => `<a href="#/bai/${l.id}">Bài ${l.id} – ${l.title}</a>`).join(" · ")}</p>` : ""}
          ${passed ? `
            <form id="certForm" class="cert-form">
              <label for="certName">Nhập họ tên để nhận chứng nhận</label>
              <div class="cert-row">
                <input id="certName" required maxlength="60" placeholder="Nguyễn Văn A" value="${esc(p.exam.name || "")}">
                <button class="btn btn-primary" type="submit">🎓 Nhận chứng nhận</button>
              </div>
            </form>` : ""}
          <div class="exam-actions center"><button class="btn btn-ghost" id="retryExam">Làm lại bài kiểm tra</button></div>
        </div>
        <h2 class="h-sub">Xem lại đáp án</h2>
        <div class="review-list">${review}</div>
      </div>
    </section>`;

  $("#retryExam").addEventListener("click", startExam);
  $("#certForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#certName").value.trim();
    if (!name) return;
    const q = loadProgress();
    const date = new Date();
    const code = "SS-" + (Array.from(name + date.toISOString()).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)).toString(36).toUpperCase().padStart(7, "0");
    q.exam = { ...q.exam, name, date: date.toISOString(), code, certScore: score };
    saveProgress(q);
    location.hash = "#/chung-nhan";
  });
}

// ---------- Chứng nhận ----------
function renderCertificate() {
  const p = loadProgress();
  const ex = p.exam;
  if (!ex?.passed || !ex.name) { location.hash = ex?.passed ? "#/kiem-tra" : "#/"; return; }
  const date = new Date(ex.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  app.innerHTML = `
    <section class="section">
      <div class="container cert-wrap">
        <a href="#/" class="back no-print">← Về khoá học</a>
        <div class="certificate">
          <div class="cert-inner">
            <div class="cert-brand">
              <svg viewBox="0 0 32 32" width="34" height="34"><path d="M16 2 4 7v8c0 7.5 5.1 13.4 12 15 6.9-1.6 12-7.5 12-15V7L16 2z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="16" cy="15" r="2.6" fill="currentColor"/></svg>
              <span>ScamShield<b>-AI</b></span>
            </div>
            <p class="cert-kicker mono">CHỨNG NHẬN HOÀN THÀNH</p>
            <p class="cert-to">Chứng nhận</p>
            <h1 class="cert-name">${esc(ex.name)}</h1>
            <p class="cert-text">đã hoàn thành khoá học <b>Phòng chống lừa đảo trực tuyến</b> gồm ${LESSONS.length} bài học và đạt bài kiểm tra tổng hợp với kết quả <b>${ex.certScore ?? ex.best}/${ex.total}</b>.</p>
            <div class="cert-foot">
              <div><span class="mono">${date}</span><small>Ngày cấp</small></div>
              <div class="seal" aria-hidden="true">🎓</div>
              <div><span class="mono">${ex.code}</span><small>Mã chứng nhận</small></div>
            </div>
          </div>
        </div>
        <div class="exam-actions center no-print">
          <button class="btn btn-primary" id="printCert">🖨️ In / lưu PDF</button>
          <a class="btn btn-ghost" href="#/kiem-tra">Làm lại bài kiểm tra</a>
        </div>
        <p class="small muted center no-print">Chứng nhận hoàn thành khoá học trên ScamShield-AI, không phải văn bằng chính thức.</p>
      </div>
    </section>`;
  $("#printCert").addEventListener("click", () => window.print());
}

route();
