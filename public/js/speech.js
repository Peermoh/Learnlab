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

// ---------- Recording (replay your own voice + cloud scoring) ----------

/**
 * Start recording the mic. Returns { stop() }; stop() resolves with a Blob (or null).
 * With onSilence, it calls back once the learner has spoken and then gone quiet
 * (or nobody spoke for a few seconds), so the UI can finish by itself.
 */
export async function startRecording({ maxMs = 8000, onSilence } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  let ctx = null;
  let poll = null;
  const done = new Promise((resolve) => {
    rec.onstop = () => {
      clearInterval(poll);
      if (ctx) ctx.close().catch(() => {});
      stream.getTracks().forEach((t) => t.stop());
      resolve(chunks.length ? new Blob(chunks, { type: rec.mimeType }) : null);
    };
  });
  rec.start();
  const timer = setTimeout(() => rec.state !== 'inactive' && rec.stop(), maxMs);

  if (onSilence) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const t0 = performance.now();
      let heard = false;
      let quietSince = t0;
      let fired = false;
      poll = setInterval(() => {
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
        const now = performance.now();
        if (peak > 12) {
          heard = true;
          quietSince = now;
        }
        const quiet = now - quietSince;
        if (!fired && ((heard && quiet > 900 && now - t0 > 700) || (!heard && now - t0 > 5000))) {
          fired = true;
          onSilence();
        }
      }, 100);
    } catch {
      /* no voice detection: the learner taps to stop */
    }
  }

  return {
    stop() {
      clearTimeout(timer);
      if (rec.state !== 'inactive') rec.stop();
      return done;
    },
  };
}

// ---------- Cloud scoring (Cloudflare Workers AI via /api/transcribe) ----------

let cloudUsable = true; // flips to false if the endpoint doesn't exist (e.g. local dev server)
export const cloudAvailable = () => cloudUsable;

/** Decode any recorded blob to 16 kHz mono 16-bit WAV, which the speech model accepts. */
async function toWav16k(blob) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  ctx.close().catch(() => {});
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * 16000)), 16000);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const pcm = (await off.startRendering()).getChannelData(0);
  const view = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const str = (o, t) => [...t].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); view.setUint32(4, 36 + pcm.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  str(36, 'data'); view.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
  return new Blob([view], { type: 'audio/wav' });
}

/** Returns the transcript. Throws { code: 'unavailable' } if no scoring service exists here. */
export async function transcribeCloud(blob) {
  const wav = await toWav16k(blob);
  let res;
  try {
    res = await fetch('/api/transcribe', { method: 'POST', body: wav, headers: { 'content-type': 'audio/wav' } });
  } catch {
    throw Object.assign(new Error('network'), { code: 'network' });
  }
  if (res.status === 404 || res.status === 405 || res.status === 501) {
    cloudUsable = false;
    throw Object.assign(new Error('unavailable'), { code: 'unavailable' });
  }
  if (!res.ok) throw Object.assign(new Error('service'), { code: 'service' });
  return (await res.json()).text || '';
}
