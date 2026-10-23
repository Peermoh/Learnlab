// Audio out (recorded native voice, or the browser's voice as a fallback) and
// audio in (recording the learner). Screens only call speak() and startRecording().

// ---------- Native audio files (made by tools/generate_audio.py) ----------

let audioFiles = new Set();
const ready = fetch('audio/manifest.json', { cache: 'no-cache' })
  .then((r) => (r.ok ? r.json() : { files: [] }))
  .then((m) => { audioFiles = new Set(m.files || []); })
  .catch(() => {});

/** File name for a piece of text. Must match audio_key() in tools/generate_audio.py. */
const audioKey = (text) => [...text.normalize('NFC')].map((c) => c.codePointAt(0).toString(16)).join('-');

export const hasAudioFiles = () => audioFiles.size > 0;

let current = null;

function playFile(key) {
  return new Promise((resolve) => {
    const a = new Audio(`audio/${key}.mp3`);
    current = a;
    a.onended = () => resolve(true);
    a.onerror = () => resolve(false);
    a.play().catch(() => resolve(false));
  });
}

// ---------- Browser voice (fallback) ----------

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

export const ttsAvailable = () => hasTTS || hasAudioFiles();
export const hasHindiVoice = () => hasAudioFiles() || !!hindiVoice();

function speakTTS(text, rate) {
  return new Promise((resolve) => {
    if (!hasTTS) return resolve(false);
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

export function stopSpeaking() {
  if (current) current.pause();
  if (hasTTS) speechSynthesis.cancel();
}

/**
 * Say `text` in Hindi. Plays the native recording when there is one (slow rates use
 * the slow recording), otherwise the browser's voice. Resolves when finished.
 */
export async function speak(text, { rate = 0.85 } = {}) {
  stopSpeaking();
  await ready;
  const key = audioKey(text);
  const slow = rate < 0.6;
  if (slow && audioFiles.has(`${key}.slow`) && (await playFile(`${key}.slow`))) return true;
  if (audioFiles.has(key) && (await playFile(key))) return true;
  return speakTTS(text, rate);
}

// ---------- Recording (replay your own voice) ----------

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
