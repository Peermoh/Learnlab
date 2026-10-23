// Audio out (text to speech) and audio in (speech recognition + scoring).
// Everything the UI needs goes through this file, so a better voice or a
// pronunciation-scoring service can replace these functions without touching screens.

const hasTTS = 'speechSynthesis' in window;
let voices = [];

function loadVoices() {
  voices = hasTTS ? speechSynthesis.getVoices() : [];
}
if (hasTTS) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

const hindiVoice = () =>
  voices.find((v) => v.lang.replace('_', '-').toLowerCase() === 'hi-in') ||
  voices.find((v) => v.lang.toLowerCase().startsWith('hi'));

export const ttsAvailable = () => hasTTS;
export const hasHindiVoice = () => !!hindiVoice();

/** Say `text` out loud in Hindi. Resolves when finished (or immediately if unsupported). */
export function speak(text, { rate = 0.85 } = {}) {
  return new Promise((resolve) => {
    if (!hasTTS) return resolve(false);
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'hi-IN';
    const v = hindiVoice();
    if (v) u.voice = v;
    u.rate = rate;
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    speechSynthesis.speak(u);
  });
}

export const stopSpeaking = () => hasTTS && speechSynthesis.cancel();

// ---------- Speech recognition (Chrome / Edge / Safari) ----------

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canRecognize = !!SR;
let active = null;

/** Listen once and resolve with a list of alternative transcripts. */
export function listen() {
  return new Promise((resolve, reject) => {
    if (!SR) return reject(new Error('unsupported'));
    stopSpeaking();
    const r = new SR();
    r.lang = 'hi-IN';
    r.maxAlternatives = 5;
    r.interimResults = false;
    let settled = false;
    r.onresult = (e) => {
      settled = true;
      resolve([...e.results[0]].map((a) => a.transcript));
    };
    r.onerror = (e) => {
      settled = true;
      reject(new Error(e.error));
    };
    r.onend = () => {
      active = null;
      if (!settled) reject(new Error('no-speech'));
    };
    active = r;
    try {
      r.start();
    } catch (err) {
      reject(err);
    }
  });
}

export const stopListening = () => active && active.stop();

// ---------- Scoring ----------

const HINDI_DIGITS = { 0: 'शून्य', 1: 'एक', 2: 'दो', 3: 'तीन', 4: 'चार', 5: 'पांच', 6: 'छह', 7: 'सात', 8: 'आठ', 9: 'नौ', 10: 'दस' };

function normalize(s) {
  return s
    .normalize('NFC')
    .replace(/\b\d+\b/g, (d) => HINDI_DIGITS[d] || d)
    .replace(/़/g, '') // nukta
    .replace(/ँ/g, 'ं') // chandrabindu → anusvara
    .replace(/[^ऀ-ॿ]/g, '')
    .replace(/[।॥]/g, ''); // dandas
}

function distance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

/** Compare what was heard with the word we asked for. Returns { score 0..1, heard }. */
export function scoreWord(target, alternatives) {
  const t = normalize(target);
  let best = { score: 0, heard: alternatives[0] || '' };
  for (const alt of alternatives) {
    const a = normalize(alt);
    if (!a) continue;
    let s = 1 - distance(t, a) / Math.max(t.length, a.length);
    if (a.includes(t)) s = Math.max(s, 0.9); // said extra words around it
    if (s > best.score) best = { score: s, heard: alt };
  }
  return best;
}

export const verdict = (score) => (score >= 0.8 ? 'great' : score >= 0.5 ? 'almost' : 'retry');

// ---------- Recording (lets the learner play back their own voice) ----------

/** Start recording the mic. Returns { stop() } where stop() resolves with a playable URL (or null). */
export async function startRecording(maxMs = 8000) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((resolve) => {
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(chunks.length ? URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })) : null);
    };
  });
  rec.start();
  const timer = setTimeout(() => rec.state !== 'inactive' && rec.stop(), maxMs);
  return {
    stop() {
      clearTimeout(timer);
      if (rec.state !== 'inactive') rec.stop();
      return done;
    },
  };
}
