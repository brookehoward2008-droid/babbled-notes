# Lilt

A tiny programming language whose front-end is your voice.

Lilt turns a short hum, sung phrase, beatbox pattern, or played line into:

- a structured JSON contract
- a readable `.lilt` text program
- a Standard MIDI file
- a Tone.js event file for browser playback

Built for the DEV Gemma 4 Challenge, May 6-24, 2026.

## Why it exists

Music tools often ask for steady hands, tiny controls, and a lot of theory up
front. Lilt starts with the gesture the user already has: make a sound, then
edit the result as plain text.

The project is designed for ADHD-friendly use: short commands, predictable
files, visible output, and no hidden project state. The neural model does the
interpretation; the compiler keeps the artifact deterministic.

## Gemma path

The contest allows Gemma 4 through several paths. This repo supports:

- `GeminiBackend`: hosted Gemma 4 through the Gemini API / Google AI Studio key
  path. Install with `pip install -e .[gemini]`.
- `FakeBackend`: no network, no API key. Useful for tests, demos, and quota-out
  moments.

As of the contest docs, the Gemini API supports `gemma-4-31b-it` and
`gemma-4-26b-a4b-it`. Lilt defaults to `gemma-4-26b-a4b-it`.

## Quick start

```powershell
cd C:\Users\toddl\OneDrive\Documents\GitHub\lilt
$env:PYTHONPATH = "src"
python -m pytest
```

Compile an existing Lilt JSON contract:

```powershell
$env:PYTHONPATH = "src"
python -m lilt.cli digest path\to\clip.wav
python -m lilt.cli compile examples\three_note_hum.json
python -m lilt.cli tonejs examples\three_note_hum.json
python -m lilt.cli info examples\three_note_hum.json
```

Run the full audio pipeline without spending API quota:

```powershell
$env:PYTHONPATH = "src"
python -m lilt.cli audio path\to\clip.wav `
  --digest examples\three_note_hum.digest.json `
  --backend fake `
  --fake-response examples\three_note_hum.json
```

Run the hosted Gemma path:

```powershell
pip install -e .[gemini]
$env:GOOGLE_API_KEY = "<your Google AI Studio key>"
$env:PYTHONPATH = "src"
python -m lilt.cli audio path\to\clip.wav --digest examples\three_note_hum.digest.json --backend gemini
```

## Browser demo

The static demo lives in `docs/`. Rebuild its data from the example JSON files:

```powershell
$env:PYTHONPATH = "src"
python -m lilt.cli demo-data
```

Then open `docs/index.html`.

## Verification

Current local check:

```powershell
$env:PYTHONPATH = "src"
python -m pytest
```
