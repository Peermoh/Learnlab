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
and fall back to the browser's own Hindi voice otherwise. Generate them once (about 200 short
clips, roughly a minute):

```sh
pip install edge-tts
python tools/generate_audio.py                                   # female voice (Swara)
python tools/generate_audio.py --voice hi-IN-MadhurNeural --force   # male voice instead
```

Then commit `public/audio/` and deploy. Re-run the script after adding words to `data.js`;
it only creates the missing files. edge-tts uses Microsoft Edge's free online voices through an
unofficial endpoint: fine for personal use, but use an official TTS service before a commercial launch.

## Practising a sound

Tap a letter to open it. Hear the letter and the example word, record yourself
(recording stops when you go quiet), then play **Mine** and **Native** back to back
and mark how close it was. Automatic pronunciation scoring was tried (browser speech
recognition, Whisper and Nova-3 on Workers AI) and removed for now; see git history.

## Deploy to Cloudflare

No build step. `wrangler.jsonc` serves `public/` as static assets. Deploy with
`npx wrangler deploy`, or connect the repo in Workers & Pages (Workers Builds).
