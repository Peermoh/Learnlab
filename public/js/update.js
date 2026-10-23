// Tells the learner when a newer version of the app has been deployed.
// It fingerprints our own files, then re-checks on focus and every few minutes.

const FILES = ['js/app.js', 'js/data.js', 'js/speech.js', 'js/store.js', 'js/update.js', 'css/styles.css', 'index.html'];
const EVERY_MS = 5 * 60 * 1000;

async function fingerprint() {
  const parts = await Promise.all(
    FILES.map((f) => fetch(f, { cache: 'no-store' }).then((r) => (r.ok ? r.text() : '')).catch(() => ''))
  );
  const text = parts.join('\u0000');
  if (!text.replace(/\u0000/g, '')) return null; // offline or blocked
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return String(h);
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

export async function watchForUpdates() {
  const baseline = await fingerprint();
  if (!baseline) return;
  let found = false;
  const check = async () => {
    if (found) return;
    const now = await fingerprint();
    if (now && now !== baseline) {
      found = true;
      showBanner();
    }
  };
  setInterval(check, EVERY_MS);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
  addEventListener('online', check);
}
