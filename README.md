# Swar · Learn Hindi by speaking

A small, dependency-free web app for learning Hindi letters and their sounds.
v1 covers the **Basic** level: vowels, consonants and vowel signs (matras).

**Each letter opens in one panel:** see it, hear it, record yourself and compare. There is also a "Tricky sounds"
listening game and a mastery map.

## Run it

```sh
python3 -m http.server 8000 --directory public
# open http://localhost:8000
```

Chrome or Edge on Android/desktop usually include a Hindi voice.
Progress is saved in `localStorage`; there are no accounts yet.

## Layout

| File | Purpose |
|---|---|
| `public/js/data.js` | All lesson content (letters, tips, example words, tricky pairs) |
| `public/js/speech.js` | Native audio playback (browser voice fallback) and recording |
| `tools/generate_audio.py` | Generates the native audio files |
| `public/js/store.js` | Progress storage |
| `public/js/app.js` | Screens and routing |
| `public/css/styles.css` | Design (light and dark) |

## Next steps

- Optional pronunciation scoring (e.g. Azure Pronunciation Assessment or MFCC/DTW against native audio).
- Intermediate and Advanced levels.

## Native audio

The **Hear**, **Slow** and **Native** buttons play MP3s from `public/audio/` when they exist,
and fall back to the browser's own Hindi voice otherwise. The files are made by
`tools/generate_audio.py` (Microsoft's neural Hindi voices via `edge-tts`).

**No local setup needed:** the *Generate audio* GitHub Action runs the script in GitHub's cloud
and commits the files whenever `data.js`, the script or `tools/audio_overrides.json` change;
Cloudflare then deploys them. To change voice or redo everything, open the repo's
**Actions → Generate audio → Run workflow**. Only clips whose text, speed or voice changed are
regenerated.

If a letter sounds wrong, change its speed (or the text the voice reads) in
`tools/audio_overrides.json`, e.g. `"ई": { "rate": "-45%" }`, and commit; the Action redoes just
that letter. Running locally also works:

```sh
pip install edge-tts
python tools/generate_audio.py              # only missing/changed clips
python tools/generate_audio.py --preview ई   # several versions in audio-preview/ to compare
```

edge-tts uses Microsoft Edge's free online voices through an unofficial endpoint: fine for
personal use, but use an official TTS service before a commercial launch.

## Practising a sound

Tap a letter to open it. Hear the letter and the example word, record yourself
(recording stops when you go quiet), then play **Mine** and **Native** back to back
and mark how close it was. Automatic pronunciation scoring was tried (browser speech
recognition, Whisper and Nova-3 on Workers AI) and removed for now; see git history.

## Deploy to Cloudflare

No build step. `wrangler.jsonc` serves `public/` as static assets. Deploy with
`npx wrangler deploy`, or connect the repo in Workers & Pages (Workers Builds).
