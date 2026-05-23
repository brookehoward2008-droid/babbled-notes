# Babbled Notes: turning hums, taps, and breath into editable music code with Gemma 4

## What I Built

Babbled Notes is a voice-and-gesture-first music tool powered by the Lilt text
language.

Instead of starting with a piano roll, notation editor, or DAW timeline, the
user starts with a human gesture:

- hum a hook
- tap a melody
- click a rhythm
- use a breath pulse
- make a switch-style selection

Babbled Notes turns that intent into:

- a structured JSON contract
- readable `.lilt` music code
- a Standard MIDI file
- Tone.js browser playback data

The public demo is static and safe to share. It lets people record, tap a
melody, choose instruments, inspect generated `.lilt` text, see recording
quality hints, and hear a starter idea.

Live demo: https://brookehoward2008-droid.github.io/babbled-notes/

Source code: https://github.com/brookehoward2008-droid/babbled-notes

## Why Gemma 4

Gemma 4 is the interpretation layer. DSP can measure timing, pitch, loudness,
onsets, pitch direction, silence ratio, and recording quality. It still does not
know what a human gesture means musically.

Gemma 4 turns those facts into schema-valid music:

- tempo
- feel
- key
- mood
- voices
- notes, rests, drum hits, dynamics, articulation, holds, and glides

The repo uses the hosted Gemini API path with `gemma-4-26b-a4b-it`. The public
browser demo does not expose an API key. The Gemma path runs locally or
server-side.

Gemma can also be used for a playback production plan instead of raw audio. The
plan describes instrument layers, spatial width, reverb, humanization, velocity
curve, vocal depth, repeat variation, and Neural Bloom response. Tone.js/Web
Audio can render those choices safely in the browser.

## What Makes It Different

Babbled Notes is not a chatbot that talks about music. It is a compiler pipeline
for musical intent:

1. capture a sound or gesture
2. extract timing, pitch, and quality facts
3. ask Gemma 4 to translate those facts into structured music JSON
4. validate the JSON
5. emit `.lilt`, MIDI, and browser playback

It also has a deterministic no-network fallback:

```powershell
python -m lilt.cli sketch path\to\clip.wav --output-base out\my-first-idea
```

That writes:

- `my-first-idea.digest.json`
- `my-first-idea.json`
- `my-first-idea.lilt`
- `my-first-idea.mid`

## Vocal Gesture Depth

The backend prompt includes a vocal gesture library so Gemma has a deeper
translation vocabulary:

- hums and vowel tones
- breath and whisper
- clicks, claps, taps
- beatbox kick/snare/hat roles
- slides, rises, falls
- trills, vibrato, staccato, held tones
- call-response phrasing
- question endings, answer endings, intentional silence

These are guidance terms. The compiler still accepts only the strict JSON
schema, so the output stays predictable.

## Neural Bloom

The demo visual is called Neural Bloom.

It starts as a quiet holographic brain in a space/electric scene. As sound plays
or recording begins, electric paths, sparks, nodes, and glow fields activate.

The visual is symbolic:

- low frequencies bloom near the base
- higher energy rises upward
- rhythm creates sparks
- repeated events strengthen paths
- spatial/resonance settings widen left/right glow

This is a creative-access metaphor, not a medical claim. The message is simple:
your music creates activation, connection, and growth.

## Accessibility

Babbled Notes is designed for people who may be autistic, non-speaking,
motor-limited, fatigued, blind, screen-reader-dependent, or unable to operate a
traditional DAW. Voice is useful, but voice is not required.

The demo includes:

- recording for hums or other sounds
- tap-to-melody input
- keyboard-reachable buttons
- optional voice-start controls
- plain text output
- local playback
- no browser API key exposure
- composer replay with Play Forever
- classical style choices for coded-note playback
- Center, Room, and Concert Hall sound-space choices
- a playback-depth receipt so users see the sound feel without sliders
- a Use in Compose bridge from recorded starter code to replayable music

The engagement loop is expression momentum, not gambling mechanics: make one
sound, feel heard, hear it become music, save or replay the version, then try
one small next move.

## Built With

- Gemma 4 via Gemini API path
- Gemini TTS for local/server-side AI voice rendering
- Python
- `mido`
- `jsonschema`
- Tone.js
- GitHub Pages

## Verification

- Live demo responds and redirects into the Neural Bloom demo.
- Live browser smoke test found `Neural Bloom`, `seed-source`, and a nonblank
  rendered canvas.
- Local tests: `97 passed, 1 skipped`.
- `python -m ruff check src tests`: passed.
- JavaScript syntax checks: passed.
- Package build: passed.
- Secret pattern scan: no API keys found.
