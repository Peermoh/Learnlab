#!/usr/bin/env python3
"""Generate natural Hindi audio for every letter, example word and practice syllable.

Reads the lesson content from public/js/data.js and writes MP3s to public/audio/,
plus public/audio/manifest.json, which tells the app which files exist.

    pip install edge-tts
    python tools/generate_audio.py                      # female voice (Swara); only changed clips
    python tools/generate_audio.py --voice hi-IN-MadhurNeural --force   # male voice, redo all
    python tools/generate_audio.py --preview ई      # hear options for one letter, then pick
    python tools/generate_audio.py --only ई,ऊ        # redo just these after editing overrides

Per-letter fixes live in tools/audio_overrides.json.

edge-tts uses Microsoft Edge's free online voices (unofficial endpoint). Fine for a
personal or learning project; switch to an official TTS service before a commercial launch.
"""
import argparse
import asyncio
import json
import re
import time
import unicodedata
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "js" / "data.js"
OUT = ROOT / "public" / "audio"
OVERRIDES = Path(__file__).resolve().parent / "audio_overrides.json"
PREVIEW = ROOT / "audio-preview"

WORD_RATE = "-10%"    # example words: natural speed
LETTER_RATE = "-25%"  # a letter on its own: slower, or the voice clips it (ई sounds like ए)
SLOW_RATE = "-50%"    # the "Slow" button
DEFAULT_VOICE = "hi-IN-SwaraNeural"


def audio_key(text: str) -> str:
    """File name for a piece of text: its code points in hex. Must match audioKey() in speech.js."""
    return "-".join(format(ord(c), "x") for c in unicodedata.normalize("NFC", text))


def load_overrides():
    if not OVERRIDES.exists():
        return {}
    data = json.loads(OVERRIDES.read_text(encoding="utf-8"))
    return {unicodedata.normalize("NFC", k): v for k, v in data.items() if not k.startswith("_")}


def clips_from_data(source: str, overrides: dict):
    """Return [(key, shown_text, spoken_text, rate)] for everything the app can say."""
    letters = re.findall(r"^\s*(?:vowel|c|m)\('[^']+',\s*'([^']+)'", source, re.M)
    words = re.findall(r"\bw\('([^']+)'", source)
    consonants = re.findall(r"^\s*c\('[^']+',\s*'([^']+)'", source, re.M)
    if not letters or not words:
        raise SystemExit("Couldn't read letters/words from data.js. Has its format changed?")

    clips = {}

    def add(text, rate, slow=False):
        o = overrides.get(unicodedata.normalize("NFC", text), {})
        spoken = o.get("text", text)
        rate = o.get("slow_rate" if slow else "rate", rate)
        clips[audio_key(text) + (".slow" if slow else "")] = (text, spoken, rate)

    for ch in letters:
        add(ch, LETTER_RATE)
        add(ch, SLOW_RATE, slow=True)  # the "Slow" button
    for word in words:
        add(word, WORD_RATE)
    for ch in consonants:  # the Tricky sounds game plays consonant + आ (e.g. खा)
        add(ch + "ा", LETTER_RATE)
    return [(k, shown, spoken, r) for k, (shown, spoken, r) in clips.items()]


async def synth(text, voice, rate, path, proxy):
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text, voice, rate=rate, proxy=proxy).save(str(path))
            return
        except Exception as e:  # network hiccups: retry a couple of times
            if attempt == 2:
                raise SystemExit(f"Failed on {text!r}: {e}")
            await asyncio.sleep(2)


async def preview(text, voice, proxy):
    """Write a few versions of one letter so you can listen and choose."""
    PREVIEW.mkdir(exist_ok=True)
    options = [(r, text) for r in ("-10%", "-25%", "-35%", "-45%")] + [("-25%", text + "।"), ("-25%", text + " " + text)]
    print(f"Listen to the files in {PREVIEW}:")
    for i, (rate, spoken) in enumerate(options, 1):
        path = PREVIEW / f"{audio_key(text)}_option{i}.mp3"
        await synth(spoken, voice, rate, path, proxy)
        print(f"  option{i}: rate {rate:>5}  text {spoken!r}")
    print('\nPut the best one in tools/audio_overrides.json, e.g.  "%s": { "rate": "-35%%" }' % text)
    print(f"then run:  python tools/generate_audio.py --only {text}")


async def generate(voice: str | None, force: bool, only: set, proxy: str | None):
    OUT.mkdir(parents=True, exist_ok=True)
    clips = clips_from_data(DATA.read_text(encoding="utf-8"), load_overrides())
    manifest_path = OUT / "manifest.json"
    old = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    voice = voice or old.get("voice") or DEFAULT_VOICE  # keep the current voice unless asked to change
    old_sigs = old.get("clips", {})
    sigs = {}
    made = skipped = 0
    for key, shown, spoken, rate in clips:
        path = OUT / f"{key}.mp3"
        sig = f"{voice}|{rate}|{spoken}"  # if any of these change, the clip is regenerated
        sigs[key] = sig
        if only:
            wanted = unicodedata.normalize("NFC", shown) in only
        else:
            wanted = force or old_sigs.get(key) != sig or not (path.exists() and path.stat().st_size > 0)
        if not wanted:
            skipped += 1
            continue
        await synth(spoken, voice, rate, path, proxy)
        made += 1
        print(f"  {shown}  ({'slow' if key.endswith('.slow') else 'normal'}, {rate})")

    if made == 0 and old.get("files") == sorted(sigs):
        print(f"Nothing to do: all {len(clips)} clips are up to date.")
        return
    # version changes on every update so phones fetch the new files instead of cached ones
    manifest = {"voice": voice, "version": int(time.time()), "files": sorted(sigs), "clips": sigs}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nDone: {made} generated, {skipped} unchanged, {len(clips)} total in {OUT}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--voice", help="hi-IN-SwaraNeural (female, default) or hi-IN-MadhurNeural (male); omit to keep the current one")
    ap.add_argument("--force", action="store_true", help="regenerate every clip, even unchanged ones")
    ap.add_argument("--only", help="comma-separated letters/words to regenerate, e.g. ई,ऊ")
    ap.add_argument("--preview", metavar="LETTER", help="write several versions of one letter to audio-preview/")
    ap.add_argument("--proxy", help="HTTP proxy URL, if your network needs one")
    args = ap.parse_args()
    if args.preview:
        asyncio.run(preview(unicodedata.normalize("NFC", args.preview), args.voice or DEFAULT_VOICE, args.proxy))
    else:
        only = {unicodedata.normalize("NFC", x.strip()) for x in args.only.split(",")} if args.only else set()
        asyncio.run(generate(args.voice, args.force, only, args.proxy))
