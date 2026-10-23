import { TRACKS, ALL_ITEMS, TRICKY_PAIRS } from './data.js';
import { getLevel, raiseLevel, resetProgress, progressOf } from './store.js';
import {
  speak, hasHindiVoice, ttsAvailable,
  canRecognize, listen, stopListening, scoreWord, verdict, recordClip,
} from './speech.js';

const $app = document.getElementById('app');
const $toast = document.getElementById('toast');

// ---------- helpers ----------

const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>',
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let toastTimer;
function toast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $toast.classList.remove('show'), 2400);
}

function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div');
  box.className = 'confetti';
  const colors = ['#5b4bdb', '#ff8a3d', '#2fb67c', '#f5b53d', '#ef6a6a', '#8a6cf0'];
  for (let i = 0; i < 46; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = Math.random() * 0.4 + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 2400);
}

const trackOf = (id) => TRACKS.find((t) => t.id === id);

const ring = (pct, size = 74) => {
  const r = 30, c = 2 * Math.PI * r;
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 74 74"><circle class="track" cx="37" cy="37" r="${r}" fill="none" stroke-width="8"/>
    <circle class="fill" cx="37" cy="37" r="${r}" fill="none" stroke-width="8" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"/></svg>
    <b>${pct}%</b></div>`;
};

const topbar = (left) => `
  <header class="topbar">
    ${left}
    <a class="iconbtn" href="#/map" aria-label="Mastery map" title="Mastery map">${ICON.grid}</a>
  </header>`;

const brand = `<a class="brand" href="#/"><span class="mark dev">स्व</span><span>Swar</span></a>`;
const back = (href, title, sub = '') => `
  <div class="crumb"><a class="iconbtn" href="${href}" aria-label="Back">${ICON.back}</a>
    <div><div>${esc(title)}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div></div>`;

const voiceNote = () =>
  !ttsAvailable()
    ? `<p class="note">This browser can’t play speech. Try Chrome or Edge.</p>`
    : !hasHindiVoice()
    ? `<p class="note">No Hindi voice was found on this device, so audio may sound off. Chrome, Edge and Android usually include one.</p>`
    : '';

// ---------- Home ----------

function nextUp() {
  return ALL_ITEMS.find((i) => getLevel(i.id) < 3) || ALL_ITEMS[0];
}

function lessonHref(item) {
  const t = trackOf(item.trackId);
  return `#/learn/${t.id}/${t.items.findIndex((x) => x.id === item.id)}`;
}

function renderHome() {
  const all = progressOf(ALL_ITEMS);
  const nxt = nextUp();
  const started = all.started > 0;
  $app.innerHTML = `<div class="view">
    ${topbar(brand)}
    <section class="hero">
      <div class="eyebrow" style="color:rgba(255,255,255,.8)">Hindi · Basic</div>
      <h1 style="margin-top:8px">Learn Hindi<br/>by saying it out loud.</h1>
      <p>See a letter, hear it, say it, and get feedback you can act on.</p>
      <div class="row">
        <a class="btn light" href="${lessonHref(nxt)}">${started ? 'Continue' : 'Start learning'} ${ICON.next}</a>
        <div style="display:flex;align-items:center;gap:12px">
          ${ring(all.pct)}
          <div class="ring-meta"><strong>${all.mastered} of ${all.total}</strong>sounds mastered</div>
        </div>
      </div>
    </section>

    <div class="levels" role="tablist" aria-label="Levels">
      <span class="pill on" role="tab" aria-selected="true">Basic</span>
      <span class="pill" role="tab" aria-disabled="true">Intermediate <small>soon</small></span>
      <span class="pill" role="tab" aria-disabled="true">Advanced <small>soon</small></span>
    </div>

    <div class="section-title"><h2>Your path</h2><span class="muted" style="font-size:14px">Take them in any order</span></div>
    <div class="grid">
      ${TRACKS.map((t) => {
        const p = progressOf(t.items);
        return `<a class="card track" href="#/track/${t.id}">
          <span class="glyph dev" aria-hidden="true">${t.glyph}</span>
          <span class="hi">${t.hi}</span>
          <h3>${t.title}</h3>
          <p>${t.blurb}</p>
          <div class="bar" aria-hidden="true"><i style="width:${p.pct}%"></i></div>
          <span class="count">${p.mastered}/${p.total} mastered</span>
        </a>`;
      }).join('')}
    </div>

    <div class="section-title"><h2>Train your ear</h2></div>
    <a class="card feature" href="#/tricky">
      <span class="ico">👂</span>
      <div><h3>Tricky sounds</h3><p>Tell apart क and ख, त and ट, ब and भ and more.</p></div>
      <span class="go">${ICON.next}</span>
    </a>
    ${started ? `<p style="text-align:center;margin-top:28px"><button class="btn ghost" data-act="reset">Reset progress</button></p>` : ''}
  </div>`;
}

// ---------- Track page ----------

function renderTrack(id) {
  const t = trackOf(id);
  if (!t) return renderHome();
  const groups = [...new Set(t.items.map((i) => i.group))];
  const p = progressOf(t.items);
  $app.innerHTML = `<div class="view">
    ${topbar(back('#/', t.title, `${t.hi} · ${p.mastered}/${p.total} mastered`))}
    ${groups.map((g) => `<section class="group"><h3>${esc(g)}</h3><div class="tiles">
      ${t.items.map((it, idx) => it.group !== g ? '' : `
        <a class="tile l${getLevel(it.id)}" href="#/learn/${t.id}/${idx}" aria-label="${esc(it.roman)}">
          <span class="dot"></span><span class="ch">${it.ch}</span><span class="rm">${esc(it.roman)}</span></a>`).join('')}
    </div></section>`).join('')}
  </div>`;
}

// ---------- Lesson (see · hear · say) ----------

let lesson = null;
const STEPS = ['See', 'Hear', 'Say'];

function renderLesson(trackId, idx) {
  const t = trackOf(trackId);
  const item = t && t.items[idx];
  if (!item) return renderHome();
  const key = `${trackId}/${idx}`;
  if (!lesson || lesson.key !== key) lesson = { key, t, item, idx, step: 0, state: 'idle', result: null, clip: null };
  lesson.t = t; lesson.item = item; lesson.idx = idx;
  draw();
}

function draw() {
  const { t, item, idx, step } = lesson;
  const prev = idx > 0 ? `#/learn/${t.id}/${idx - 1}` : null;
  const next = idx < t.items.length - 1 ? `#/learn/${t.id}/${idx + 1}` : `#/track/${t.id}`;
  let body = '';
  if (step === 0) body = seeStep();
  else if (step === 1) body = hearStep();
  else body = sayStep();

  $app.innerHTML = `<div class="view">
    ${topbar(back(`#/track/${t.id}`, t.title, `${idx + 1} of ${t.items.length}`))}
    <div class="stepper" aria-label="Steps">
      ${STEPS.map((s, i) => `<div class="s ${i < step ? 'done' : i === step ? 'cur' : ''}"><i></i>${s}</div>`).join('')}
    </div>
    ${body}
    <div class="footer-nav">
      ${prev ? `<a class="btn ghost" href="${prev}">${ICON.back} Previous</a>` : '<span></span>'}
      ${step === 2 ? `<a class="btn soft" href="${next}">${idx < t.items.length - 1 ? 'Next letter' : 'Finish'} ${ICON.next}</a>` : '<span></span>'}
    </div>
  </div>`;
}

const sentence = (item) => `Sounds like ${item.sound}`;

function seeStep() {
  const { item } = lesson;
  return `<div class="stack">
    <section class="card letter-card">
      <div class="big">${item.ch}</div>
      <div class="roman">${esc(item.roman)}</div>
      <div class="sound">${esc(sentence(item))}</div>
    </section>
    <div class="tip"><span class="em">💡</span><div><b>How to say it.</b> ${esc(item.tip)}</div></div>
    <div class="wordcard">
      <div><div class="hi">${item.word.hi}</div><div class="rm">${esc(item.word.roman)}</div><div class="en">${esc(item.word.en)}</div></div>
      <div class="muted" style="font-size:13px;text-align:right">Example<br/>word</div>
    </div>
    <div class="actions"><button class="btn primary" data-act="step" data-to="1">Hear it ${ICON.next}</button></div>
  </div>`;
}

function hearStep() {
  const { item } = lesson;
  return `<div class="stack">
    <section class="card letter-card">
      <div class="big sm">${item.ch}</div>
      <div class="roman">${esc(item.roman)}</div>
    </section>
    <div class="actions" style="margin-top:0">
      <button class="play" data-act="say" data-text="${esc(item.ch)}" data-rate="0.85"><span class="pi">${ICON.play}</span>Letter</button>
      <button class="play" data-act="say" data-text="${esc(item.ch)}" data-rate="0.45"><span class="pi">${ICON.play}</span>Slow</button>
      <button class="play accent" data-act="say" data-text="${esc(item.word.hi)}" data-rate="0.8"><span class="pi">${ICON.play}</span>${item.word.hi}</button>
    </div>
    <div class="tip"><span class="em">👂</span><div>Listen two or three times. Say it quietly to yourself as you listen. <b>${esc(item.tip)}</b></div></div>
    ${voiceNote()}
    <div class="actions"><button class="btn primary" data-act="step" data-to="2">Now you say it ${ICON.next}</button></div>
  </div>`;
}

function sayStep() {
  const { item, state, result } = lesson;
  const rec = canRecognize;
  const mic = `<div class="mic-wrap"><button class="mic ${state === 'listening' ? 'live' : ''}" data-act="${rec ? 'listen' : 'record'}" aria-label="${state === 'listening' ? 'Stop' : 'Start speaking'}">${state === 'listening' ? ICON.stop : ICON.mic}</button></div>
    <p class="mic-hint">${state === 'listening' ? (rec ? 'Listening… say the word' : 'Recording…') : result ? 'Tap to try again' : rec ? 'Tap and say the word above' : 'Tap, say the word, then compare'}</p>`;

  let out = '';
  if (rec && result) {
    const v = verdict(result.score);
    const copy = {
      great: ['🎉', 'Great, that sounded right!'],
      almost: ['👍', 'Almost there'],
      retry: ['🔁', 'Let’s try that again'],
    }[v];
    out = `<section class="result ${v}">
      <div class="emoji">${copy[0]}</div><h3>${copy[1]}</h3>
      <div class="meter"><i style="width:${Math.max(6, Math.round(result.score * 100))}%"></i></div>
      <div class="heard">I heard: <b>${esc(result.heard || '—')}</b></div>
      ${v !== 'great' ? `<p class="muted" style="margin-top:10px;font-size:14px"><b>Tip:</b> ${esc(item.tip)}</p>` : ''}
    </section>`;
  } else if (rec && result === false) {
    out = `<p class="note">I couldn’t hear anything. Check that the browser has permission to use your microphone, then try again.</p>`;
  } else if (!rec) {
    out = `<p class="note">Voice checking isn’t supported in this browser (try Chrome or Edge). You can still record yourself and compare it with the native voice.</p>
      ${lesson.clip ? `<div class="compare"><div class="actions" style="margin:0">
          <button class="play" data-act="say" data-text="${esc(item.word.hi)}" data-rate="0.8"><span class="pi">${ICON.play}</span>Native</button>
          <button class="play accent" data-act="clip"><span class="pi">${ICON.play}</span>You</button></div>
        <p class="muted" style="font-size:14px">How close was it?</p>
        <div class="rate"><button class="btn soft" data-act="rate" data-v="3">Nailed it</button><button class="btn soft" data-act="rate" data-v="2">Almost</button></div></div>` : ''}`;
  }

  return `<div class="stack">
    <div class="wordcard">
      <div><div class="hi">${item.word.hi}</div><div class="rm">${esc(item.word.roman)}</div><div class="en">${esc(item.word.en)}</div></div>
      <button class="play" data-act="say" data-text="${esc(item.word.hi)}" data-rate="0.8" aria-label="Hear the word"><span class="pi">${ICON.play}</span>Hear</button>
    </div>
    ${mic}
    ${out}
  </div>`;
}

function mastered(item, level) {
  const gained = raiseLevel(item.id, level);
  if (gained && level === 3) {
    confetti();
    toast(`${item.ch} mastered`);
  }
}

async function onListen() {
  if (lesson.state === 'listening') return stopListening();
  lesson.state = 'listening';
  lesson.result = null;
  draw();
  try {
    const alts = await listen();
    lesson.result = scoreWord(lesson.item.word.hi, alts);
    const v = verdict(lesson.result.score);
    mastered(lesson.item, v === 'great' ? 3 : v === 'almost' ? 2 : 1);
  } catch {
    lesson.result = false;
  }
  lesson.state = 'idle';
  draw();
}

async function onRecord() {
  if (lesson.state === 'listening') return;
  lesson.state = 'listening';
  draw();
  try {
    lesson.clip = await recordClip();
    raiseLevel(lesson.item.id, 1);
  } catch {
    toast('Microphone not available');
  }
  lesson.state = 'idle';
  draw();
}

// ---------- Mastery map ----------

function renderMap() {
  $app.innerHTML = `<div class="view">
    ${topbar(back('#/', 'Mastery map', 'Every sound at a glance'))}
    <div class="legend"><span>New</span><span class="a">Seen</span><span class="b">Practised</span><span class="c">Mastered</span></div>
    ${TRACKS.map((t) => `<section class="group"><h3>${t.title} · ${t.hi}</h3><div class="tiles">
      ${t.items.map((it, idx) => `<a class="tile l${getLevel(it.id)}" href="#/learn/${t.id}/${idx}" aria-label="${esc(it.roman)}">
        <span class="dot"></span><span class="ch">${it.ch}</span><span class="rm">${esc(it.roman)}</span></a>`).join('')}
    </div></section>`).join('')}
  </div>`;
}

// ---------- Tricky sounds game ----------

let quiz = null;
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);

function startQuiz() {
  const rounds = shuffle(TRICKY_PAIRS).slice(0, 8).map((p) => {
    const answer = Math.random() < 0.5 ? p.a : p.b;
    return { ...p, answer, picked: null };
  });
  quiz = { rounds, i: 0, correct: 0 };
}

function renderTricky() {
  if (!quiz) startQuiz();
  const q = quiz;
  if (q.i >= q.rounds.length) {
    $app.innerHTML = `<div class="view">${topbar(back('#/', 'Tricky sounds'))}
      <section class="card final stack">
        <div class="score">${q.correct}/${q.rounds.length}</div>
        <h2>${q.correct >= 7 ? 'Sharp ears!' : q.correct >= 4 ? 'Getting there' : 'Keep listening'}</h2>
        <p class="muted">These pairs take practice. Aspirated sounds (with a puff of air) and curled-tongue sounds are new to English speakers.</p>
        <div class="actions"><button class="btn primary" data-act="quiz-again">Play again</button><a class="btn soft" href="#/">Home</a></div>
      </section></div>`;
    return;
  }
  const r = q.rounds[q.i];
  const syll = r.answer.ch + 'ा';
  const done = r.picked !== null;
  const cls = (c) => (!done ? '' : c.id === r.answer.id ? 'right' : c.id === r.picked ? 'wrong' : '');
  $app.innerHTML = `<div class="view">
    ${topbar(back('#/', 'Tricky sounds', 'Which one did you hear?'))}
    <p class="qprog">Question ${q.i + 1} of ${q.rounds.length}</p>
    <section class="card letter-card">
      <button class="play" data-act="say" data-text="${esc(syll)}" data-rate="0.6" style="margin:0 auto"><span class="pi">${ICON.play}</span>Play sound</button>
    </section>
    <div class="choices">
      ${[r.a, r.b].map((c) => `<button class="choice ${cls(c)}" data-act="pick" data-id="${c.id}" ${done ? 'disabled' : ''}>
        <div class="ch">${c.ch}</div><div class="rm">${esc(c.roman)}</div></button>`).join('')}
    </div>
    ${done ? `<div class="tip" style="margin-top:16px"><span class="em">${r.picked === r.answer.id ? '✅' : '💡'}</span><div>${esc(r.hint)}</div></div>
      <div class="actions"><button class="btn primary" data-act="quiz-next">${q.i + 1 < q.rounds.length ? 'Next' : 'See score'} ${ICON.next}</button></div>` : ''}
    ${voiceNote()}
  </div>`;
  if (!done && !r.played) { r.played = true; speak(syll, { rate: 0.6 }); }
}

// ---------- Events ----------

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  if (act === 'say') {
    el.classList.add('playing');
    await speak(el.dataset.text, { rate: Number(el.dataset.rate) || 0.85 });
    el.classList.remove('playing');
    if (lesson && lesson.step === 1) raiseLevel(lesson.item.id, 1);
  } else if (act === 'step') {
    lesson.step = Number(el.dataset.to);
    draw();
    scrollTo({ top: 0 });
  } else if (act === 'listen') onListen();
  else if (act === 'record') onRecord();
  else if (act === 'clip') new Audio(lesson.clip).play();
  else if (act === 'rate') {
    mastered(lesson.item, Number(el.dataset.v));
    toast(el.dataset.v === '3' ? 'Nice work' : 'Keep going, you’ll get it');
  } else if (act === 'pick') {
    const r = quiz.rounds[quiz.i];
    r.picked = el.dataset.id;
    if (r.picked === r.answer.id) quiz.correct++;
    renderTricky();
  } else if (act === 'quiz-next') { quiz.i++; renderTricky(); }
  else if (act === 'quiz-again') { startQuiz(); renderTricky(); }
  else if (act === 'reset') {
    if (confirm('Reset all your progress on this device?')) { resetProgress(); lesson = null; renderHome(); }
  }
});

// ---------- Router ----------

function route() {
  stopListening();
  const [page, a, b] = location.hash.replace(/^#\/?/, '').split('/');
  if (page !== 'learn') lesson = null;
  if (page !== 'tricky') quiz = null;
  if (page === 'track') renderTrack(a);
  else if (page === 'learn') renderLesson(a, Number(b));
  else if (page === 'map') renderMap();
  else if (page === 'tricky') renderTricky();
  else renderHome();
  if (page !== 'learn') scrollTo({ top: 0 });
}

addEventListener('hashchange', route);
route();
