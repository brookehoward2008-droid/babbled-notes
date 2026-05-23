---
title: Babbled Notes: turning hums, taps, and breath into editable music code with Gemma 4
published: true
tags: devchallenge, gemmachallenge, gemma
---

*This is a submission for the [Gemma 4 Challenge: Build with Gemma 4](https://dev.to/challenges/google-gemma-2026-05-06).*

## What I Built

Babbled Notes is a voice-and-gesture-first music tool for people who may not be able to use a traditional DAW, piano roll, notation editor, or speech-first creative app.

The user starts with a human gesture:

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
- a playback-depth plan for space, reverb, humanization, and variation

The goal is musical agency. A user should be able to make one sound, feel heard, hear it become music, replay it with depth, and then change one small thing.

The demo visual is called Neural Bloom. It starts as a quiet holographic brain in a space/electric scene. As sound plays or recording begins, electric paths, sparks, nodes, and glow fields activate. It is a creative-access metaphor, not a medical claim: your music creates activation, connection, and growth.

## Demo

Live demo:

https://brookehoward2008-droid.github.io/babbled-notes/

The public demo includes:

- recording for hums or other sounds
- recording quality hints
- starter `.lilt` code from a recording
- Use in Compose bridge from recorded starter code to replayable music
- tap-to-melody input
- keyboard-reachable buttons
- optional voice-start controls
- plain text output
- local playback
- composer replay with Play Forever
- Bach, Mozart, Beethoven, and Chopin style choices
- Center, Room, and Concert Hall sound-space choices
- a playback-depth receipt so users can see the sound feel without using sliders

The engagement loop is expression momentum, not gambling mechanics: make one sound, feel heard, hear it become music, save or replay the version, then try one next move.

## Code

Repository:

https://github.com/brookehoward2008-droid/babbled-notes

The pipeline is intentionally testable and artifact-based:

1. capture a sound or gesture
2. extract timing, pitch, and quality facts
3. ask Gemma 4 to translate those facts into structured music JSON
4. validate the JSON
5. emit `.lilt`, MIDI, and browser playback

There is also a deterministic no-network fallback:

```powershell
python -m lilt.cli sketch path\to\clip.wav --output-base out\my-first-idea
```

That writes:

- `my-first-idea.digest.json`
- `my-first-idea.json`
- `my-first-idea.lilt`
- `my-first-idea.mid`

Current verification:

- Local tests: `97 passed, 1 skipped`
- `python -m ruff check src tests`: passed
- JavaScript syntax checks: passed
- Package build: passed
- Secret pattern scan: no API keys found

## How I Used Gemma 4

Gemma 4 is the interpretation layer. DSP can measure timing, pitch, loudness, onsets, pitch direction, silence ratio, and recording quality. It still does not know what a human gesture means musically.

Gemma 4 turns those facts into schema-valid music:

- tempo
- feel
- key
- mood
- voices
- notes, rests, drum hits, dynamics, articulation, holds, and glides

The repo uses the hosted Gemini API path with `gemma-4-26b-a4b-it`. I chose the 26B A4B/MoE path because Babbled Notes needs stronger reasoning than a tiny edge model for interpreting ambiguous human sound, but it still benefits from the efficiency of an active-parameter MoE design. It is doing creative translation, not just classification.

The public browser demo does not expose an API key. The Gemma path runs locally or server-side.

Gemma can also be used for a playback production plan instead of raw audio. The plan describes:

- instrument layers
- spatial width
- reverb
- humanization
- velocity curve
- vocal depth
- repeat variation
- Neural Bloom response

Tone.js/Web Audio renders those choices safely in the browser.

The backend prompt includes a vocal gesture library so Gemma has a deeper translation vocabulary:

- hums and vowel tones
- breath and whisper
- clicks, claps, taps
- beatbox kick/snare/hat roles
- slides, rises, falls
- trills, vibrato, staccato, held tones
- call-response phrasing
- question endings, answer endings, intentional silence

These are guidance terms. The compiler still accepts only the strict JSON schema, so the output stays predictable.

Babbled Notes is not a chatbot that talks about music. It is a compiler pipeline for musical intent, with Gemma 4 translating human sound into something a person can edit, replay, export, and share.
