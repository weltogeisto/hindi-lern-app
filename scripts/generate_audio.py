#!/usr/bin/env python3
"""
Generate pronunciation MP3s for the Hindi alphabet data using gTTS (Google TTS).

Usage:
  python scripts/generate_audio.py

Requirements:
  pip install -r requirements.txt

Notes:
- This script reads `src/data/alphabets.json` and writes MP3 files to `public/audio/`.
- It uses the Devanagari `character` field and the Hindi language code (`hi`) so pronunciation
  should sound correct for most characters.
- Existing files will be skipped to avoid re-downloading.
"""
import json
import argparse
from pathlib import Path
from gtts import gTTS

ROOT = Path(__file__).resolve().parents[1]
SRC_JSON = ROOT / 'src' / 'data' / 'alphabets.json'
OUT_DIR = ROOT / 'public' / 'audio'

OUT_DIR.mkdir(parents=True, exist_ok=True)


def safe_filename(entry):
    # prefer transliteration when safe, otherwise use unicode codepoint
    translit = entry.get('transliteration')
    if translit and all(c.isalnum() or c in ('-', '_') for c in translit):
        return translit.lower().replace(' ', '_')
    ch = entry.get('character')
    if ch:
        return 'u' + '_'.join(hex(ord(c))[2:] for c in ch)
    return 'unknown'


parser = argparse.ArgumentParser(description='Generate MP3s for Hindi alphabet using gTTS')
parser.add_argument('--overwrite', action='store_true', help='Overwrite existing files')
args = parser.parse_args()

if not SRC_JSON.exists():
    print(f"Source data file not found: {SRC_JSON}")
    raise SystemExit(1)

with SRC_JSON.open('r', encoding='utf-8') as f:
    data = json.load(f)

for entry in data:
    fname = safe_filename(entry) + '.mp3'
    out_path = OUT_DIR / fname
    if out_path.exists() and not args.overwrite:
        print(f"Skipping existing: {out_path.name}")
        continue

    text = entry.get('character') or entry.get('transliteration')
    if not text:
        print(f"No text to synthesize for entry: {entry}")
        continue

    print(f"Generating {out_path.name} for '{text}'")
    try:
        tts = gTTS(text=text, lang='hi')
        tts.save(str(out_path))
    except Exception as e:
        print(f"Failed to generate {out_path.name}: {e}")

print('Done.')
