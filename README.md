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
| `public/js/speech.js` | Text to speech and recording |
| `public/js/store.js` | Progress storage |
| `public/js/app.js` | Screens and routing |
| `public/css/styles.css` | Design (light and dark) |

## Next steps

- Swap browser TTS for pre-generated audio files (change `speak()` in `public/js/speech.js`).
- Optional pronunciation scoring (e.g. Azure Pronunciation Assessment or MFCC/DTW against native audio).
- Intermediate and Advanced levels.

## Practising a sound

Tap a letter to open it. Hear the letter and the example word, record yourself
(recording stops when you go quiet), then play **Mine** and **Native** back to back
and mark how close it was. Automatic pronunciation scoring was tried (browser speech
recognition, Whisper and Nova-3 on Workers AI) and removed for now; see git history.

## Deploy to Cloudflare

No build step. `wrangler.jsonc` serves `public/` as static assets. Deploy with
`npx wrangler deploy`, or connect the repo in Workers & Pages (Workers Builds).
