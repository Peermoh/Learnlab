# Swar · Learn Hindi by speaking

A small, dependency-free web app for learning Hindi letters and their sounds.
v1 covers the **Basic** level: vowels, consonants and vowel signs (matras).

**Each letter has three steps:** See it, Hear it, Say it. Saying it is checked
with speech recognition and gives feedback. There is also a "Tricky sounds"
listening game and a mastery map.

## Run it

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Use Chrome or Edge for the full experience (speech recognition + Hindi voice).
Progress is saved in `localStorage`; there are no accounts yet.

## Layout

| File | Purpose |
|---|---|
| `js/data.js` | All lesson content (letters, tips, example words, tricky pairs) |
| `js/speech.js` | Text to speech, speech recognition, scoring, recording |
| `js/store.js` | Progress storage |
| `js/app.js` | Screens and routing |
| `css/styles.css` | Design (light and dark) |

## Next steps

- Swap browser TTS for pre-generated audio files (change `speak()` in `speech.js`).
- Add phoneme-level scoring (e.g. Azure Pronunciation Assessment) behind `scoreWord()`.
- Intermediate and Advanced levels.
