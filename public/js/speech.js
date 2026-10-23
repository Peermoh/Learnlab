// Audio out (text to speech) and audio in (recording the learner).
// Everything the UI needs goes through this file, so a better voice can replace
// speak() without touching screens.

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
