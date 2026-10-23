// Cloudflare Worker: serves the static app (./public) and scores speech.
// POST /api/transcribe  (body: 16 kHz mono WAV)  ->  { text }

const MAX_BYTES = 1_500_000;
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

function toBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/transcribe') return new Response('Not found', { status: 404 });
    if (request.method !== 'POST') return json({ error: 'method' }, 405);
    // Only our own pages may use the speech model.
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) return json({ error: 'origin' }, 403);

    const body = new Uint8Array(await request.arrayBuffer());
    if (!body.length) return json({ error: 'empty' }, 400);
    if (body.length > MAX_BYTES) return json({ error: 'too-large' }, 413);

    try {
      const out = await env.AI.run('@cf/openai/whisper-large-v3-turbo', {
        audio: toBase64(body),
        language: 'hi',
        task: 'transcribe',
      });
      return json({ text: (out && out.text ? String(out.text) : '').trim() });
    } catch (e) {
      return json({ error: 'ai', detail: String(e && e.message ? e.message : e) }, 502);
    }
  },
};
