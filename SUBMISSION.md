# Babbled Notes DEV Submission Package

## Submission Links

- Live demo: https://brookehoward2008-droid.github.io/babbled-notes/
- Source code: https://github.com/brookehoward2008-droid/babbled-notes
- Challenge: https://dev.to/challenges/google-gemma-2026-05-06/

## One-Sentence Pitch

Babbled Notes turns hums, taps, breaths, clicks, or switch-style input into
editable music code, MIDI, and browser playback so people who cannot use
traditional music tools can still express musical ideas.

## DEV Post Draft

Paste-ready version: [DEV_POST.md](DEV_POST.md).

### Title

Babbled Notes: turning hums, taps, and breath into editable music code with Gemma 4

### What I Built

Babbled Notes is a tiny voice-and-gesture-first music tool powered by the Lilt
text language.

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

The backend also carries a vocal gesture library so Gemma has a deeper musical
vocabulary for human sounds: hums, vowel tones, breath, whisper, clicks, claps,
taps, beatbox roles, slides, rises, falls, trills, vibrato, staccato notes,
held tones, call-response phrasing, and intentional silence.

The public demo is static and safe to share. It lets people record, tap a
melody, choose instruments, inspect the generated `.lilt` text, and understand
the sound alphabet.

### Why Gemma 4

Gemma 4 is the interpretation layer. DSP can measure timing, pitch, loudness,
and onsets, but it does not know what a gesture means musically. Gemma 4 turns
those facts into a schema-valid musical idea:

- tempo
- feel
- key
- mood
- voices
- notes, rests, drum hits, dynamics, and articulation

I chose the hosted Gemini API path with `gemma-4-26b-a4b-it` because it is a
practical Gemma 4 route for development and demo preparation. The code also
keeps a fake backend so the pipeline can be tested without quota or network
access. The architecture leaves room for a private on-device Gemma runtime later,
but that is a roadmap path, not something the public browser demo claims today.

### What Makes It Different

Babbled Notes is not a chatbot that talks about music. It is a compiler
pipeline for musical intent:

1. capture a sound or gesture
2. extract timing and pitch facts
3. ask Gemma 4 to turn those facts into structured music JSON
4. validate the JSON
5. emit `.lilt`, MIDI, and browser playback

The result is an artifact people can keep working with. A musician can import
the MIDI into GarageBand, Ableton, Logic, MuseScore, or an assistive music rig.
A collaborator can edit the `.lilt` text in a pull request. A screen-reader
user can review the musical idea as plain text.

### Originality and Attribution

This submission is Brooke's original project idea and build direction:
accessible music creation from hums, taps, switch-style input, readable code,
MIDI, browser playback, and optional AI voice rendering.

The project uses standard open source/runtime building blocks:

- Python package tooling
- `jsonschema`
- `mido`
- Tone.js for browser audio playback
- Gemini/Gemma through Google AI Studio
- Gemini TTS for local/server-side voice rendering

Those tools support the project, but the core product is original: Babbled
Notes turns small human sounds into editable musical programs and gives users a
loopable, style-aware way to hear their own coded notes become music.

### Accessibility

The accessibility goal is musical agency with emotional safety.

Babbled Notes is designed for people who may be autistic, non-speaking,
motor-limited, fatigued, blind, screen-reader-dependent, or unable to operate a
traditional DAW. Voice is useful, but voice is not required.

The browser demo includes:

- recording for hums or other sounds
- tap-to-melody input
- keyboard-reachable buttons
- plain text output
- instrument selection
- no tracking or analytics
- local recording playback
- composer replay with Play Forever
- classical style choices for the user's own coded notes
- optional local/server-side AI voice rendering

The sound alphabet is intentionally small:

| Gesture | Musical meaning |
|---|---|
| hum | pitched note |
| long hum | held note |
| pause | rest |
| tap/click | drum hit |
| soft breath | soft or ghost hit |
| rising sound | melodic rise or glide |
| loud/quiet sound | dynamic |
| short/smooth sound | articulation |

Babbled Notes is meant to heal, teach, expand, and invite expression. The user
should feel listened to, not corrected. The first playback matters because a
cheap or harsh sound can make someone stop creating; the project treats sound
quality as part of accessibility.

This is research-informed, not a medical claim. Music has evidence-backed roles
in communication, emotion, movement, reward, and social connection, including
music therapy work with autistic people and auditory-motor mapping research for
minimally verbal children. Babbled Notes is not therapy or diagnosis; it is a
creative access tool built from the belief that music can give people another
way to be heard.

### How Collaboration Works

Because the song becomes `.lilt` text, musical collaboration can happen in the
same way code collaboration happens.

Example:

```diff
- voice bass:
-   C2 hold ! soft
+ voice bass:
+   C2 ! soft G1 ! soft C2 hold ! mf
```

That tiny diff changes the musical arrangement without forcing every
collaborator into the same DAW.

### What I Am Submitting

- Live browser demo
- Open source Python package and static web demo
- JSON schema for Gemma output
- deterministic code generation
- MIDI emitter
- Tone.js emitter
- local WAV digest generator
- deterministic digest-to-song seed generator for no-network fallback
- fake backend for offline tests
- Gemini/Gemma backend for hosted model use
- local/server-side Gemini TTS voice render path
- playback depth plan for Tone.js/Web Audio production choices
- accessibility notes and test plan

### What Works Today

- Record UI and local playback in supported browsers
- Tap-to-melody input
- Instrument selection
- Classical style choices for coded-note playback
- Play Forever loop for iterative composing
- Example playback through Tone.js
- JSON -> `.lilt`
- JSON -> `.mid`
- JSON -> Tone.js
- WAV -> digest JSON
- WAV -> deterministic digest, starter JSON, `.lilt`, and MIDI through `lilt sketch`
- digest JSON -> starter `.json`, `.lilt`, and `.mid`
- audio + digest + backend -> JSON/Lilt/MIDI
- JSON -> AI voice prompt or local/server-side voice WAV
- JSON -> playback depth plan or Gemma playback-plan prompt
- recording quality hints: usable, too quiet, clipped, very loud
- musical feature hints: pitch direction and gesture density
- test suite

### Visual Direction

The intended visual language is tech, space, and electricity. The reactive
graphic should begin as a quiet, nearly empty translucent brain. As the user's
music plays, electric pathways, stars, sparks, and signal lines grow through it.
Rhythm, pitch, volume, repetition, and sound space should shape the glow.

The image is also meant to echo Gemma 4 if it were visible: structured,
luminous, layered, and pattern-forming. This is a creative-access metaphor, not
a medical claim.

### Known Limits

The public GitHub Pages demo does not call Gemma directly because a browser
frontend cannot safely hold an API key. The Gemma API path is implemented for
local/server-side use. For judging, the public page demonstrates the user
experience and artifacts; the repo demonstrates the backend integration and
testable pipeline.

Future direction: a local or on-device Gemma runtime could make Babbled Notes
more private, but the submission only claims the hosted Gemma path that is
implemented here.

AI voice rendering is also local/server-side. The public static page does not
store or expose a Google AI Studio key.

### Built With

- Gemma 4 via Gemini API path
- Python
- mido
- jsonschema
- Tone.js
- Gemini TTS for local/server-side AI voice rendering
- GitHub Pages

## Demo Script

1. Open https://brookehoward2008-droid.github.io/babbled-notes/
2. Show the sentence: "Start with one sound."
3. Record a short sound, stop, and play it back.
4. Point out that the digest is a model receipt, not homework for the user.
5. Tap C, E, G in "Tap a melody"; show the generated Lilt source changing.
6. Change the instrument to Bell or Plucked string and play the taps.
7. Play the built-in demos.
8. Show "Why it is different."
9. Show "Build a song" with melody, pulse, and bass.
10. Show "Work with others" and the text diff.
11. Close with: Babbled Notes makes musical ideas editable, portable, and accessible.

## Submission Checklist

- [ ] DEV post uses the Build With Gemma 4 template.
- [x] Live demo link included.
- [x] GitHub repo link included.
- [x] Gemma 4 model named: `gemma-4-26b-a4b-it`.
- [x] Explain why Gemma 4 is doing real work.
- [x] Explain why public demo does not expose API key.
- [x] Mention accessibility and non-speaking input.
- [x] Mention outputs: `.lilt`, MIDI, Tone.js, digest JSON.
- [x] Mention tests and code quality.
- [x] Mention visual direction: tech, space, electricity, neural bloom.
- [x] Do not include API keys.
- [ ] Confirm participant/team eligibility before submitting.

## Judging Criteria Mapping

| Criterion | Babbled Notes answer |
|---|---|
| Intentional Gemma 4 use | Gemma interprets audio/digest facts into schema-valid music JSON. |
| Technical implementation | Tested Python pipeline, schema validation, deterministic codegen, MIDI/Tone.js emitters. |
| Creativity/originality | A music accessibility compiler, not another chatbot or DAW clone. |
| Usability/UX | Record, tap, play forever, choose classical style and sound space, inspect readable output, send feedback. |

## Final Submission Claims To Verify

- [x] Babbled Notes is Brooke's own submission concept and implementation direction.
- [x] Gemma 4 is doing real interpretive work, not just being mentioned.
- [x] Public demo does not expose API keys.
- [x] AI voice rendering is documented as local/server-side.
- [x] The app supports voice, touch, keyboard, and switch-style paths.
- [x] No slider-only control is required for the main flow.
- [x] Sound quality is treated as accessibility, not decoration.
- [x] Sources and third-party libraries are named clearly.

## Verification Evidence

- Live demo URL responds and redirects into the Neural Bloom demo.
- Live browser smoke test found `Neural Bloom`, `seed-source`, and a nonblank
  rendered canvas.
- Local tests: `89 passed, 1 skipped`.
- Lint: `python -m ruff check src tests` passed.
- JavaScript syntax checks passed for demo scripts.
- Package build passed with source archive and wheel.
- Secret pattern scan found no API keys in repo text.

## Research-Informed Motivation

- Harvard Medicine Magazine: music engages broad brain systems, including
  emotion, reward, memory, and motor networks.
- American Music Therapy Association: music therapy is used to support
  communication, expression, and emotional goals for autistic people.
- Auditory-Motor Mapping Training research: intonation and bimanual movement can
  create an interactive music-making path for spoken-language learning in
  minimally verbal autistic children.
- DEV Gemma 4 Challenge: Build submissions are judged on intentional Gemma 4
  use, code quality, creativity/originality, and usability/UX.
