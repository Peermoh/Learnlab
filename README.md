# Swar · Learn Hindi by speaking

A small, dependency-free web app for learning Hindi letters and their sounds.
v1 covers the **Basic** level: vowels, consonants and vowel signs (matras).

**Each letter has three steps:** See it, Hear it, Say it. Saying it is checked
with speech recognition and gives feedback. There is also a "Tricky sounds"
listening game and a mastery map.

## Run it

```sh
python3 -m http.server 8000 --directory public
# open http://localhost:8000
```

Use Chrome or Edge for the full experience (speech recognition + Hindi voice).
Progress is saved in `localStorage`; there are no accounts yet.

## Layout

| File | Purpose |
|---|---|
| `public/js/data.js` | All lesson content (letters, tips, example words, tricky pairs) |
| `public/js/speech.js` | Text to speech, speech recognition, scoring, recording |
| `public/js/store.js` | Progress storage |
| `public/js/app.js` | Screens and routing |
| `public/css/styles.css` | Design (light and dark) |

## Next steps

- Swap browser TTS for pre-generated audio files (change `speak()` in `public/js/speech.js`).
- Add phoneme-level scoring (e.g. Azure Pronunciation Assessment) behind `scoreWord()`.
- Intermediate and Advanced levels.

## Pronunciation checking

The mic records you, converts the audio to 16 kHz WAV in the browser, and POSTs it to
`/api/transcribe` (`src/worker.js`), which runs Whisper on Cloudflare Workers AI
(`@cf/openai/whisper-large-v3-turbo`, Hindi). The transcript is scored against the target word.
If that endpoint doesn't exist (e.g. the plain `http.server`), the app falls back to the
browser's own speech recognition.

## Deploy to Cloudflare

No build step. `wrangler.jsonc` serves `public/` as static assets, runs `src/worker.js` for
`/api/*` and binds Workers AI as `AI`. Deploy with `npx wrangler deploy`, or connect the repo
in Workers & Pages (Workers Builds) with deploy command `npx wrangler deploy`.
