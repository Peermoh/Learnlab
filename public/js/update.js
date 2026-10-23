// Tells the learner when a newer version of the app has been deployed.
// It fingerprints our own files, then re-checks on focus and every minute.

const FILES = ['js/app.js', 'js/data.js', 'js/speech.js', 'js/store.js', 'js/update.js', 'css/styles.css', 'index.html'];
const EVERY_MS = 60 * 1000;

async function fingerprint() {
  const parts = await Promise.all(
    FILES.map((f) => fetch(f, { cache: 'no-store' }).then((r) => (r.ok ? r.text() : '')).catch(() => ''))
  );
  const text = parts.join('\u0000');
  if (!text.replace(/\u0000/g, '')) return null; // offline or blocked
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function showBanner() {
  if (document.getElementById('update-banner')) return;
  const el = document.createElement('div');
  el.id = 'update-banner';
  el.className = 'update-banner';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="u-ico">✨</span><div><b>Update available</b><span>A new version of Swar is ready.</span></div><button type="button">Refresh</button>`;
  el.querySelector('button').addEventListener('click', () => location.reload());
  document.body.appendChild(el);
}

let baseline = null;
export const appVersion = () => baseline;

/** Check now. Resolves 'new' (banner shown), 'latest' or 'offline'. */
export async function checkNow() {
  const now = await fingerprint();
  if (!now) return 'offline';
  if (baseline && now !== baseline) {
    showBanner();
    return 'new';
  }
  return 'latest';
}

export async function watchForUpdates() {
  baseline = await fingerprint();
  if (!baseline) return;
  document.documentElement.dataset.ver = baseline;
  dispatchEvent(new Event('swar-version'));
  const check = () => document.visibilityState === 'visible' && checkNow();
  setInterval(check, EVERY_MS);
  document.addEventListener('visibilitychange', check);
  addEventListener('focus', check);
  addEventListener('pageshow', check);
  addEventListener('online', check);
}
