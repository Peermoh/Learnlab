#!/usr/bin/env python3
"""Generate natural Hindi audio for every letter, example word and practice syllable.

Reads the lesson content from public/js/data.js and writes MP3s to public/audio/,
plus public/audio/manifest.json, which tells the app which files exist.

    pip install edge-tts
    python tools/generate_audio.py                      # female voice (Swara)
    python tools/generate_audio.py --voice hi-IN-MadhurNeural --force   # male voice, redo all

edge-tts uses Microsoft Edge's free online voices (unofficial endpoint). Fine for a
personal or learning project; switch to an official TTS service before a commercial launch.
"""
import argparse
import asyncio
import json
import re
import unicodedata
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "js" / "data.js"
OUT = ROOT / "public" / "audio"

NORMAL_RATE = "-10%"
SLOW_RATE = "-45%"


def audio_key(text: str) -> str:
    """File name for a piece of text: its code points in hex. Must match audioKey() in speech.js."""
    return "-".join(format(ord(c), "x") for c in unicodedata.normalize("NFC", text))


def clips_from_data(source: str):
    """Return [(key, text, rate)] for everything the app can say."""
    letters = re.findall(r"^\s*(?:vowel|c|m)\('[^']+',\s*'([^']+)'", source, re.M)
    words = re.findall(r"\bw\('([^']+)'", source)
    consonants = re.findall(r"^\s*c\('[^']+',\s*'([^']+)'", source, re.M)
    if not letters or not words:
        raise SystemExit("Couldn't read letters/words from data.js. Has its format changed?")

    clips = {}
    for ch in letters:
        clips[audio_key(ch)] = (ch, NORMAL_RATE)
        clips[audio_key(ch) + ".slow"] = (ch, SLOW_RATE)  # the "Slow" button
    for word in words:
        clips[audio_key(word)] = (word, NORMAL_RATE)
    for ch in consonants:  # the Tricky sounds game plays consonant + आ (e.g. खा)
        clips[audio_key(ch + "ा")] = (ch + "ा", NORMAL_RATE)
    return [(k, t, r) for k, (t, r) in clips.items()]


async def generate(voice: str, force: bool, proxy: str | None):
    OUT.mkdir(parents=True, exist_ok=True)
    clips = clips_from_data(DATA.read_text(encoding="utf-8"))
    made = skipped = 0
    for key, text, rate in clips:
        path = OUT / f"{key}.mp3"
        if path.exists() and path.stat().st_size > 0 and not force:
            skipped += 1
            continue
        for attempt in range(3):
            try:
                await edge_tts.Communicate(text, voice, rate=rate, proxy=proxy).save(str(path))
                break
            except Exception as e:  # network hiccups: retry a couple of times
                if attempt == 2:
                    raise SystemExit(f"Failed on {text!r}: {e}")
                await asyncio.sleep(2)
        made += 1
        print(f"  {text}  ({'slow' if key.endswith('.slow') else 'normal'})")

    manifest = {"voice": voice, "files": sorted(k for k, _, _ in clips)}
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nDone: {made} generated, {skipped} already there, {len(clips)} total in {OUT}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--voice", default="hi-IN-SwaraNeural", help="hi-IN-SwaraNeural (female) or hi-IN-MadhurNeural (male)")
    ap.add_argument("--force", action="store_true", help="regenerate files that already exist")
    ap.add_argument("--proxy", help="HTTP proxy URL, if your network needs one")
    args = ap.parse_args()
    asyncio.run(generate(args.voice, args.force, args.proxy))
