#!/usr/bin/env python3
"""Generate natural Hindi audio for every letter, example word and practice syllable.

Reads the lesson content from public/js/data.js and writes MP3s to public/audio/,
plus public/audio/manifest.json, which tells the app which files exist.

    pip install edge-tts
    python tools/generate_audio.py                      # female voice (Swara); only changed clips
    python tools/generate_audio.py --voice hi-IN-MadhurNeural --force   # male voice, redo all
    python tools/generate_audio.py --preview ई      # hear options for one letter, then pick
    python tools/generate_audio.py --only ई,ऊ        # redo just these after editing overrides

    # ElevenLabs instead (needs ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in the environment)
    python tools/generate_audio.py --voice elevenlabs

Per-letter fixes live in tools/audio_overrides.json.

Engines: edge-tts uses Microsoft Edge's free online voices (unofficial endpoint), fine for a
personal or learning project. ElevenLabs is an official paid API (its free tier is
non-commercial); the voice is stored as "elevenlabs:<model>:<voice_id>" in the manifest.
"""
import argparse
import asyncio
import json
import os
import re
import time
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "js" / "data.js"
OUT = ROOT / "public" / "audio"
OVERRIDES = Path(__file__).resolve().parent / "audio_overrides.json"
PREVIEW = ROOT / "audio-preview"

WORD_RATE = "-10%"    # example words: natural speed
LETTER_RATE = "-25%"  # a letter on its own: slower, or the voice clips it (ई sounds like ए)
SLOW_RATE = "-50%"    # the "Slow" button
DEFAULT_VOICE = "hi-IN-SwaraNeural"
ELEVENLABS_MODEL = "eleven_multilingual_v2"  # speaks Hindi
ELEVENLABS_URL = os.environ.get("ELEVENLABS_BASE_URL", "https://api.elevenlabs.io")


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
    consonants = re.findall(r"^\s*c\('([^']+)',\s*'([^']+)'", source, re.M)  # (id, letter)
    signs_block = re.search(r"BARAKHADI_SIGNS = \[(.*?)\n\];", source, re.S)
    skip_block = re.search(r"BARAKHADI_SKIP = \[([^\]]*)\]", source)
    if not letters or not words or not signs_block or not skip_block:
        raise SystemExit("Couldn't read letters/words/barakhadi from data.js. Has its format changed?")
    signs = re.findall(r"\['([^']*)',\s*'[^']+'\]", signs_block.group(1))
    skip = set(re.findall(r"'([^']+)'", skip_block.group(1)))

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
    for _, ch in consonants:  # the Tricky sounds game plays consonant + आ (e.g. खा)
        add(ch + "ा", LETTER_RATE)
    for cid, ch in consonants:  # the बारहखड़ी chart: every consonant with every vowel sign
        if cid not in skip:
            for sign in signs:
                add(ch + sign, LETTER_RATE)
    return [(k, shown, spoken, r) for k, (shown, spoken, r) in clips.items()]


def resolve_voice(voice: str) -> str:
    """Turn "elevenlabs" or "elevenlabs:<voice_id>" into "elevenlabs:<model>:<voice_id>"; Edge voices pass through."""
    if voice != "elevenlabs" and not voice.startswith("elevenlabs:"):
        return voice
    parts = voice.split(":")[1:]
    if len(parts) == 2:
        return voice
    voice_id = parts[0] if parts else os.environ.get("ELEVENLABS_VOICE_ID", "").strip()
    if not voice_id:
        raise SystemExit("ElevenLabs needs a voice: set ELEVENLABS_VOICE_ID (or use --voice elevenlabs:<voice_id>).")
    model = os.environ.get("ELEVENLABS_MODEL", "").strip() or ELEVENLABS_MODEL
    return f"elevenlabs:{model}:{voice_id}"


def elevenlabs_speed(rate: str) -> float:
    """Edge-style "-25%" -> ElevenLabs speed 0.75, kept inside the 0.7-1.2 range the API accepts."""
    return round(min(1.2, max(0.7, 1 + int(rate.rstrip("%")) / 100)), 2)


def elevenlabs_tts(text, voice, rate, path):
    _, model, voice_id = voice.split(":")
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not key:
        raise SystemExit("ElevenLabs needs ELEVENLABS_API_KEY in the environment (a GitHub secret in Actions).")
    body = json.dumps({
        "text": text,
        "model_id": model,
        "voice_settings": {"stability": 0.6, "similarity_boost": 0.75, "speed": elevenlabs_speed(rate)},
    }).encode()
    req = urllib.request.Request(
        f"{ELEVENLABS_URL}/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128",
        data=body,
        headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            Path(path).write_bytes(res.read())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:300]
        if e.code in (401, 403):  # bad key or plan limits: retrying won't help
            raise SystemExit(f"ElevenLabs refused the request ({e.code}): {detail}")
        raise RuntimeError(f"HTTP {e.code}: {detail}")


async def synth(text, voice, rate, path, proxy):
    for attempt in range(3):
        try:
            if voice.startswith("elevenlabs:"):
                await asyncio.to_thread(elevenlabs_tts, text, voice, rate, path)
            else:
                import edge_tts
                await edge_tts.Communicate(text, voice, rate=rate, proxy=proxy).save(str(path))
            return
        except SystemExit:
            raise
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
    voice = resolve_voice(voice or old.get("voice") or DEFAULT_VOICE)  # keep the current voice unless asked to change
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
    ap.add_argument("--voice", help="hi-IN-SwaraNeural (female, default), hi-IN-MadhurNeural (male), or elevenlabs[:<voice_id>]; omit to keep the current one")
    ap.add_argument("--force", action="store_true", help="regenerate every clip, even unchanged ones")
    ap.add_argument("--only", help="comma-separated letters/words to regenerate, e.g. ई,ऊ")
    ap.add_argument("--preview", metavar="LETTER", help="write several versions of one letter to audio-preview/")
    ap.add_argument("--proxy", help="HTTP proxy URL, if your network needs one")
    args = ap.parse_args()
    if args.preview:
        asyncio.run(preview(unicodedata.normalize("NFC", args.preview), resolve_voice(args.voice or DEFAULT_VOICE), args.proxy))
    else:
        only = {unicodedata.normalize("NFC", x.strip()) for x in args.only.split(",")} if args.only else set()
        asyncio.run(generate(args.voice, args.force, only, args.proxy))
