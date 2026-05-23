# Babbled Notes

A sound-first music tool powered by the Lilt text language.

Babbled Notes turns a short hum, sung phrase, beatbox pattern, or played line into:

- a structured JSON contract
- a readable `.lilt` text program
- a Standard MIDI file
- a Tone.js event file for browser playback

Built for the DEV Gemma 4 Challenge, May 6-24, 2026.
Submission materials: see [SUBMISSION.md](SUBMISSION.md).
Presentation runbook: see [PRESENTATION.md](PRESENTATION.md).

## Why it exists

Music tools often ask for steady hands, tiny controls, and a lot of theory up
front. Babbled Notes starts with the gesture the user already has: make a sound,
then edit the result as plain text.

The project is designed for ADHD-friendly use: short commands, predictable
files, visible output, and no hidden project state. The neural model does the
interpretation; the compiler keeps the artifact deterministic.

## What makes it different

Babbled Notes is not a chatbot that gives music advice. It is a small compiler
pipeline for musical intent:

1. capture a hum, beatbox, tap pattern, or short played phrase
2. extract timing and pitch facts
3. ask Gemma to turn those facts into structured music JSON
4. validate the JSON
5. emit useful artifacts

The output is meant to leave the demo:

- `.lilt`: readable music code that can be edited with a screen reader or text editor
- `.mid`: a MIDI file for GarageBand, Ableton, Logic, MuseScore, or assistive music rigs
- Tone.js JSON: browser playback for sharing
- digest JSON: the timing and pitch receipt the model used

For non-speaking users, the browser demo also includes a tap-to-melody path:
notes can be placed with touch, keyboard focus, or switch-style controls without
recording a voice.

For users who benefit from voice-first controls, the recorder can be armed once
with a button and then respond to simple phrases like "start recording" and
"stop recording." It is not always-on; the user must opt in first.

The browser tool also includes a Composer Workspace. Users can edit `.lilt`
source directly, play the edited song, save it locally, open it again later, and
load a demo into the workspace as a starting point.

The composer is built around a quick win: choose Bach, Mozart, Beethoven, or
Chopin style, choose Center, Room, or Concert Hall sound space, then use Play
Forever while changing the notes. The loop is meant to help the user hear their
own idea becoming music instead of hearing a one-shot toy sound.

## Visual direction

The next visual pass should use a tech, space, and electricity language instead
of paper-cutout graphics. The core image is a symbolic neural bloom:

- start with a quiet, translucent, nearly empty brain
- let the user's music fill it with electric paths, stars, sparks, and signal
  lines
- map rhythm, pitch, volume, repetition, and sound space to growth and motion
- make the image feel like Gemma 4 if it were visible: structured, luminous,
  layered, and pattern-forming

This is a metaphor for creative activation, not a medical claim.

## Sound alphabet

Babbled Notes uses a small input alphabet so the model knows how to map human
sound and gesture into editable music code:

| Input | Meaning | `.lilt` output |
|---|---|---|
| hum or sung tone | pitched note | `C4 ! mf` |
| longer hum | held note | `G4 hold` |
| pause | rest | `rest 1` |
| tap, clap, or click | drum hit | `x` |
| soft breath or soft click | ghost/soft hit | `o` |
| rising pitch | glide or melodic rise | `C4 ~ E4` |
| loud sound | louder dynamic | `! loud` |
| short clipped sound | articulation | `/ staccato` |

The same alphabet can also be driven by tap buttons or assisted selection, so
the system does not depend on speech.

## Full song build demo

A complete Babbled Notes workflow is intentionally small:

1. Capture a hook with voice, tapping, keyboard, or assisted selection.
2. Let Babbled Notes/Gemma translate the gesture into validated Lilt JSON.
3. Emit `.lilt`, `.mid`, and Tone.js playback.
4. Edit the text to arrange the idea.
5. Share the text or MIDI with collaborators.

Example first build:

```lilt
# Brooke's first idea
tempo 86
feel straight
key C major

mood gentle, warm

voice melody:
  C4 ! soft E4 ! mf G4 hold ! mf

voice pulse:
  x . . . x . . .

voice bass:
  C2 hold ! soft
```

That output can become:

- a playable browser demo
- a MIDI import in a DAW
- a pull request where someone edits one musical line
- a text message to another musician
- a screen-reader-friendly artifact for review

## Collaboration workflow

Babbled Notes is built for collaboration because the song is plain text.

```diff
- voice bass:
-   C2 hold ! soft
+ voice bass:
+   C2 ! soft G1 ! soft C2 hold ! mf
```

A collaborator can change the bass, instrument, tempo, drum pattern, or key and
send back a tiny text diff. That keeps the workflow accessible to people who
cannot operate a full DAW timeline but can read, listen, review, or approve
small changes.

## Gemma path

The contest allows Gemma 4 through several paths. This repo supports:

- `GeminiBackend`: hosted Gemma 4 through the Gemini API / Google AI Studio key
  path. Install with `pip install -e .[gemini]`.
- `FakeBackend`: no network, no API key. Useful for tests, demos, and quota-out
  moments.

As of the contest docs, the Gemini API supports `gemma-4-31b-it` and
`gemma-4-26b-a4b-it`. Babbled Notes defaults to `gemma-4-26b-a4b-it`.

The public browser demo does not expose an API key. The hosted Gemma path runs
from local or server-side code. Longer term, the clean backend boundary leaves
room for a private on-device Gemma runtime after the hosted version is stable.

## Quick start

```powershell
cd C:\Users\toddl\OneDrive\Documents\GitHub\babbled-notes
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
# Set GOOGLE_API_KEY in your local shell before running this.
$env:PYTHONPATH = "src"
python -m lilt.cli audio path\to\clip.wav --digest examples\three_note_hum.digest.json --backend gemini
```

Render an AI voice prompt or WAV locally. This uses your Google AI Studio key
from local/server-side code, never from GitHub Pages:

```powershell
$env:PYTHONPATH = "src"
python -m lilt.cli voice examples\three_note_hum.json --style chopin --dry-run-prompt

pip install -e .[gemini]
# Set GEMINI_API_KEY in your local shell before running this.
python -m lilt.cli voice examples\three_note_hum.json --style chopin -o examples\three_note_hum.voice.wav
```

## Browser demo

The static demo lives in `docs/`. Rebuild its data from the example JSON files:

```powershell
$env:PYTHONPATH = "src"
python -m lilt.cli demo-data
```

Then open `docs/index.html`.

## Package prep

Before packaging or publishing:

```powershell
$env:PYTHONPATH = "src"
python -m pytest
node --check docs/composer.js
node --check docs/player.js
node --check docs/voice-control.js
node --check docs/meadow.js
node --check docs/recorder.js
node --check docs/accessible.js
node --check docs/backdrop.js
git diff --check
$secretPattern = "AI" + "za|sk-[A-Za-z0-9]|" + "GEMINI_API_KEY\\s*=|" + "GOOGLE_API_KEY\\s*="
rg -n $secretPattern README.md SUBMISSION.md docs src tests pyproject.toml
python -m build
```

`dist/` is ignored by Git. Keep API keys in the local shell or deployment
secrets, never in the static demo.

## Verification

Current local check:

```powershell
$env:PYTHONPATH = "src"
python -m pytest
```
