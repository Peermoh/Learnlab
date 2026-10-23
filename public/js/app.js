import { TRACKS, ALL_ITEMS, TRICKY_PAIRS } from './data.js';
import { getLevel, raiseLevel, resetProgress, progressOf } from './store.js';
import {
  speak, hasHindiVoice, ttsAvailable,
  canRecognize, listen, stopListening, scoreWord, verdict, startRecording, transcribeCloud, cloudAvailable,
} from './speech.js';
import { watchForUpdates, checkNow } from './update.js';
import { toRoman } from './translit.js';

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
    <button class="iconbtn ${location.hash.startsWith('#/map') ? 'on' : ''}" data-act="map-toggle" aria-pressed="${location.hash.startsWith('#/map')}" aria-label="Mastery map" title="Mastery map">${ICON.grid}</button>
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
  return `#/track/${t.id}/${t.items.findIndex((x) => x.id === item.id)}`;
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
    <p class="ver">Version <span data-version>…</span><button data-act="check-update">Check for updates</button></p>
  </div>`;
  stampVersion();
}

function stampVersion() {
  const v = document.documentElement.dataset.ver;
  document.querySelectorAll('[data-version]').forEach((el) => (el.textContent = v || '—'));
}
addEventListener('swar-version', stampVersion);

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
        <a class="tile l${getLevel(it.id)}" href="#/track/${t.id}/${idx}" aria-label="${esc(it.roman)}">
          <span class="dot"></span><span class="ch">${it.ch}</span><span class="rm">${esc(it.roman)}</span></a>`).join('')}
    </div></section>`).join('')}
  </div>`;
}

// ---------- Letter sheet (tap a letter, everything is right there) ----------

let sheet = null; // { t, idx, state, result, error, clip, recorder }
let player = null;

function setClip(sh, blob) {
  if (sh.clip) URL.revokeObjectURL(sh.clip);
  sh.clip = blob ? URL.createObjectURL(blob) : null;
}
const $sheet = document.createElement('div');
document.body.appendChild($sheet);

const MIC_ERRORS = {
  'not-allowed': 'The microphone is blocked. Tap the icon at the left of the address bar, allow Microphone, then try again.',
  'service-not-allowed': 'The microphone is blocked. Tap the icon at the left of the address bar, allow Microphone, then try again.',
  'no-speech': 'I didn’t hear anything. Try again a little closer and louder.',
  'audio-capture': 'No microphone was found on this device.',
  network: 'The speech service couldn’t be reached. Check your internet connection.',
  'language-not-supported': 'Hindi voice recognition isn’t available in this browser.',
  aborted: '',
};

function drawSheet() {
  const { t, idx, state, result, error } = sheet;
  const item = t.items[idx];
  const rec = canRecognize || cloudAvailable();
  const go = (i) => `#/${sheet.base}/${t.id}/${i}`;

  let feedback = '';
  if (result) {
    const v = verdict(result.score);
    const copy = { great: ['🎉', 'Great, that sounded right!'], almost: ['👍', 'Almost there'], retry: ['🔁', 'Let’s try that again'] }[v];
    const heard = result.heard || '';
    feedback = `<section class="result ${v}"><div class="emoji">${copy[0]}</div><h3>${copy[1]}</h3>
      <div class="meter"><i style="width:${Math.max(6, Math.round(result.score * 100))}%"></i></div>
      <div class="cmp">
        ${result.engines ? result.engines.map((e) => `<div class="cmp-row you ${e.name === result.best ? 'best' : ''}"><div>
            <div class="lbl">${e.name} heard${e.name === result.best ? ' · used' : ''}</div>
            ${e.error ? `<div class="r">Not available: ${esc(e.error)}</div>` : `<div class="w">${e.heard ? esc(e.heard) : '—'}</div><div class="r">${e.heard ? esc(toRoman(e.heard)) + ` · ${Math.round(e.score * 100)}%` : 'nothing clear'}</div>`}</div>
            ${e.name === result.best && sheet.clip ? `<button class="play accent" data-act="clip" aria-label="Play my voice"><span class="pi">${ICON.play}</span>Mine</button>` : ''}</div>`).join('') : `
        <div class="cmp-row you"><div><div class="lbl">You said</div><div class="w">${heard ? esc(heard) : '—'}</div><div class="r">${heard ? esc(toRoman(heard)) : 'nothing clear'}</div></div>
          ${sheet.clip ? `<button class="play accent" data-act="clip" aria-label="Play my voice"><span class="pi">${ICON.play}</span>Mine</button>` : ''}</div>`}
        <div class="cmp-row"><div><div class="lbl">Target</div><div class="w">${item.word.hi}</div><div class="r">${esc(item.word.roman)}</div></div>
          <button class="play" data-act="say" data-text="${esc(item.word.hi)}" data-rate="0.8" aria-label="Hear the word"><span class="pi">${ICON.play}</span>Native</button></div>
      </div>
      ${v !== 'great' ? `<p class="muted" style="margin-top:12px;font-size:14px"><b>Tip:</b> ${esc(item.tip)}</p>` : ''}</section>`;
  } else if (error) {
    feedback = `<p class="note">${esc(error)}</p>`;
  } else if (!rec) {
    feedback = `<p class="note">Voice checking isn’t supported in this browser (try Chrome or Edge). Record yourself and compare with the native voice instead.</p>`;
  }
  if (sheet.note) feedback += `<p class="note">${esc(sheet.note)}</p>`;

  const micLabel =
    state === 'recording' ? 'Recording… tap to stop'
    : state === 'processing' ? 'Checking your pronunciation…'
    : state === 'listening' ? 'Listening… say the word'
    : rec ? 'Tap and say the word' : 'Tap to record yourself';
  const busy = state !== 'idle';

  $sheet.innerHTML = `<div class="scrim" data-act="close"></div>
  <section class="sheet" role="dialog" aria-modal="true" aria-label="${esc(item.roman)}">
    <div class="grab"></div>
    <div class="sheet-top">
      <button class="iconbtn" data-act="sheet-go" data-to="${idx - 1}" aria-label="Previous letter" ${idx === 0 ? 'disabled' : ''}>${ICON.back}</button>
      <span class="muted" style="font-weight:700;font-size:14px">${t.title} · ${idx + 1} of ${t.items.length}</span>
      <button class="iconbtn" data-act="sheet-go" data-to="${idx + 1}" aria-label="Next letter" ${idx === t.items.length - 1 ? 'disabled' : ''}>${ICON.next}</button>
    </div>
    <div class="sheet-body">
      <div class="sheet-letter">
        <div class="big">${item.ch}</div>
        <div class="roman">${esc(item.roman)}</div>
        <div class="sound">Sounds like ${esc(item.sound)}</div>
      </div>

      <div class="actions" style="margin-top:6px">
        <button class="play" data-act="say" data-text="${esc(item.ch)}" data-rate="0.85"><span class="pi">${ICON.play}</span>Hear</button>
        <button class="play" data-act="say" data-text="${esc(item.ch)}" data-rate="0.45"><span class="pi">${ICON.play}</span>Slow</button>
      </div>

      <div class="tip" style="margin-top:16px"><span class="em">💡</span><div>${esc(item.tip)}</div></div>

      <div class="wordcard" style="margin-top:12px">
        <div><div class="hi">${item.word.hi}</div><div class="rm">${esc(item.word.roman)}</div><div class="en">${esc(item.word.en)}</div></div>
        <button class="play accent" data-act="say" data-text="${esc(item.word.hi)}" data-rate="0.8" aria-label="Hear the word"><span class="pi">${ICON.play}</span>Hear</button>
      </div>

      <div class="say-box">
        <div class="mic-wrap"><button class="mic small ${state === 'processing' ? 'wait' : busy ? 'live' : ''}" data-act="${rec && state !== 'recording' ? 'listen' : 'record'}" aria-label="${busy ? 'Stop' : 'Say it'}">${state === 'processing' ? '<span class="spin"></span>' : busy ? ICON.stop : ICON.mic}</button></div>
        <p class="mic-hint">${micLabel}</p>
        ${sheet.clip || (rec && state === 'idle') ? `<div class="actions">
          ${sheet.clip ? `<button class="play accent" data-act="clip"><span class="pi">${ICON.play}</span>Play my voice</button>` : ''}
          ${rec ? `<button class="play" data-act="record"><span class="pi">${ICON.mic}</span>Record myself</button>` : ''}
          ${!rec && sheet.clip ? `<button class="btn soft" data-act="rate" data-v="3">Nailed it</button><button class="btn soft" data-act="rate" data-v="2">Almost</button>` : ''}
        </div>` : ''}
        ${state === 'recording' && rec ? `<div class="actions"><button class="play" data-act="record"><span class="pi">${ICON.stop}</span>Stop recording</button></div>` : ''}
        ${feedback}
      </div>
    </div>
  </section>`;
  document.body.style.overflow = 'hidden';
  if (result || error) $sheet.querySelector('.say-box').scrollIntoView({ block: 'end', behavior: 'smooth' });
}

function mastered(item, level) {
  const gained = raiseLevel(item.id, level);
  if (gained && level === 3) {
    confetti();
    toast(`${item.ch} mastered`);
  }
}

function finishAttempt(mine, item, text, alts) {
  mine.result = scoreWord(item.word.hi, alts || [text]);
  const v = verdict(mine.result.score);
  mastered(item, v === 'great' ? 3 : v === 'almost' ? 2 : 1);
}

async function onListen() {
  const mine = sheet;
  if (mine.state === 'listening') {
    if (mine.recorder) return finishRecordedAttempt(mine); // cloud path: tap to stop early
    return stopListening(); // browser recogniser path
  }
  if (mine.state !== 'idle') return;
  mine.result = null;
  mine.error = '';
  mine.note = '';

  if (cloudAvailable()) {
    try {
      mine.recorder = await startRecording({ onSilence: () => mine.state === 'listening' && finishRecordedAttempt(mine) });
      mine.state = 'listening';
      drawSheet();
      return;
    } catch {
      mine.error = MIC_ERRORS['not-allowed'];
      if (sheet === mine) drawSheet();
      return;
    }
  }
  return browserAttempt(mine);
}

// Record, then ask the cloud model what was said.
async function finishRecordedAttempt(mine) {
  const item = mine.t.items[mine.idx];
  const rec = mine.recorder;
  mine.recorder = null;
  mine.state = 'processing';
  if (sheet === mine) drawSheet();
  const blob = await rec.stop();
  setClip(mine, blob);
  try {
    const out = await transcribeCloud(blob, mine.t.items.map((x) => x.word.hi));
    // Side-by-side test: score what each model heard, keep the best for the verdict.
    const engines = [
      { name: 'Whisper', ...out.whisper },
      { name: 'Nova-3', ...out.nova },
    ].map((e) => ({ ...e, ...(e.text ? scoreWord(item.word.hi, [e.text]) : { score: 0, heard: '' }) }));
    if (engines.some((e) => e.heard)) {
      const best = engines.reduce((a, b) => (b.score > a.score ? b : a));
      finishAttempt(mine, item, best.heard);
      mine.result.engines = engines;
      mine.result.best = best.name;
    } else mine.error = MIC_ERRORS['no-speech'];
  } catch (e) {
    if (e.code === 'silent') mine.error = MIC_ERRORS['no-speech'];
    else if (e.code === 'unavailable' && canRecognize) {
      mine.note = 'Using your browser’s voice check instead.';
      mine.state = 'idle';
      return browserAttempt(mine);
    }
    else mine.error = e.code === 'network' ? MIC_ERRORS.network : 'The pronunciation checker had a problem. Please try again in a moment.';
  }
  mine.state = 'idle';
  if (sheet === mine) drawSheet();
}

// Fallback: the browser's own recogniser (Chrome / Edge / Safari).
async function browserAttempt(mine) {
  const item = mine.t.items[mine.idx];
  mine.state = 'listening';
  drawSheet();

  // Record while recognising so the learner can replay their voice. Best effort:
  // touch devices usually can't share the mic, so only desktops try.
  let rec = null;
  if (!navigator.maxTouchPoints) {
    try { rec = await startRecording(); } catch { /* recording is optional */ }
  }
  let alts = null;
  let err = null;
  try {
    alts = await listen();
  } catch (e) {
    if (e.message === 'audio-capture' && rec) {
      await rec.stop();
      rec = null;
      try { alts = await listen(); } catch (e2) { err = e2; }
    } else err = e;
  }
  if (rec) setClip(mine, await rec.stop());
  if (alts) finishAttempt(mine, item, '', alts);
  else mine.error = err.message in MIC_ERRORS ? MIC_ERRORS[err.message] : `Something went wrong (${err.message}).`;
  mine.state = 'idle';
  if (sheet === mine) drawSheet();
}

async function onRecord() {
  const mine = sheet;
  if (mine.state === 'recording') {
    setClip(mine, await mine.recorder.stop());
    mine.recorder = null;
    mine.state = 'idle';
    raiseLevel(mine.t.items[mine.idx].id, 1);
    if (sheet === mine) drawSheet();
    return;
  }
  if (mine.state !== 'idle') return;
  mine.error = '';
  try {
    mine.recorder = await startRecording();
    mine.state = 'recording';
    // auto-stop after the recorder's time limit
    setTimeout(() => mine.state === 'recording' && onRecord(), 8100);
  } catch {
    mine.error = MIC_ERRORS['not-allowed'];
  }
  if (sheet === mine) drawSheet();
}

// ---------- Mastery map ----------

function renderMap() {
  $app.innerHTML = `<div class="view">
    ${topbar(back('#/', 'Mastery map', 'Every sound at a glance'))}
    <div class="legend"><span>New</span><span class="a">Seen</span><span class="b">Practised</span><span class="c">Mastered</span></div>
    ${TRACKS.map((t) => `<section class="group"><h3>${t.title} · ${t.hi}</h3><div class="tiles">
      ${t.items.map((it, idx) => `<a class="tile l${getLevel(it.id)}" href="#/map/${t.id}/${idx}" aria-label="${esc(it.roman)}">
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
    if (sheet) raiseLevel(sheet.t.items[sheet.idx].id, 1);
  } else if (act === 'map-toggle') {
    location.hash = location.hash.startsWith('#/map') ? lastPage : '#/map';
  } else if (act === 'check-update') {
    el.textContent = 'Checking…';
    const r = await checkNow();
    el.textContent = 'Check for updates';
    if (r === 'latest') toast('You’re on the latest version');
    else if (r === 'offline') toast('Couldn’t check. Are you online?');
  } else if (act === 'close') {
    const base = sheet.base;
    const t = sheet.t.id;
    sheet = null;
    location.hash = base === 'map' ? '#/map' : `#/track/${t}`;
  } else if (act === 'sheet-go') {
    const i = Number(el.dataset.to);
    if (i < 0 || i >= sheet.t.items.length) return;
    stopListening();
    sheet.recorder?.stop();
    history.replaceState(null, '', `#/${sheet.base}/${sheet.t.id}/${i}`);
    sheet = { t: sheet.t, idx: i, base: sheet.base, state: 'idle', result: null, error: '', note: '', clip: null, recorder: null };
    drawSheet();
  } else if (act === 'listen') onListen();
  else if (act === 'record') onRecord();
  else if (act === 'clip') {
    player?.pause();
    player = new Audio(sheet.clip);
    player.play();
  }
  else if (act === 'rate') {
    mastered(sheet.t.items[sheet.idx], Number(el.dataset.v));
    toast(el.dataset.v === '3' ? 'Nice work' : 'Keep going, you’ll get it');
  } else if (act === 'pick') {
    const r = quiz.rounds[quiz.i];
    r.picked = el.dataset.id;
    if (r.picked === r.answer.id) quiz.correct++;
    renderTricky();
  } else if (act === 'quiz-next') { quiz.i++; renderTricky(); }
  else if (act === 'quiz-again') { startQuiz(); renderTricky(); }
  else if (act === 'reset') {
    if (confirm('Reset all your progress on this device?')) { resetProgress(); renderHome(); }
  }
});

// ---------- Router ----------

let lastPage = '#/';

function route() {
  stopListening();
  const [page, a, b] = location.hash.replace(/^#\/?/, '').split('/');
  if (page !== 'tricky') quiz = null;
  const idx = b === undefined ? NaN : Number(b);
  if (page !== 'map') lastPage = page === 'track' ? `#/track/${a}` : page === 'tricky' ? '#/tricky' : '#/';
  if (page === 'track') renderTrack(a);
  else if (page === 'map') renderMap();
  else if (page === 'tricky') renderTricky();
  else renderHome();
  if ((page === 'track' || page === 'map') && !Number.isNaN(idx)) {
    const t = trackOf(a);
    if (t && t.items[idx]) {
      if (!sheet || sheet.t.id !== t.id || sheet.idx !== idx || sheet.base !== page) sheet = { t, idx, base: page, state: 'idle', result: null, error: '', note: '', clip: null, recorder: null };
      drawSheet();
      return;
    }
  }
  sheet = null;
  $sheet.innerHTML = '';
  document.body.style.overflow = '';
  scrollTo({ top: 0 });
}

addEventListener('hashchange', route);
addEventListener('keydown', (e) => e.key === 'Escape' && sheet && document.querySelector('[data-act="close"]').click());
route();
watchForUpdates();
