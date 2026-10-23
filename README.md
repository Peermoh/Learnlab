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

## Deploy to Cloudflare

Static site, no build step. In Cloudflare Pages: connect this repo, leave the
build command empty and set the output directory to `public`.
Or from the CLI: `npx wrangler deploy` (uses `wrangler.jsonc`).
