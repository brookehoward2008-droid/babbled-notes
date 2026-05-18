# Lilt DEV Submission Package

## Submission Links

- Live demo: https://brookehoward2008-droid.github.io/lilt/
- Source code: https://github.com/brookehoward2008-droid/lilt
- Challenge: https://dev.to/challenges/google-gemma-2026-05-06/

## One-Sentence Pitch

Lilt turns hums, taps, breaths, clicks, or switch-style input into editable music
code, MIDI, and browser playback so people who cannot use traditional music
tools can still express musical ideas.

## DEV Post Draft

### Title

Lilt: turning hums, taps, and breath into editable music code with Gemma 4

### What I Built

Lilt is a tiny voice-and-gesture-first music programming language.

Instead of starting with a piano roll, notation editor, or DAW timeline, the
user starts with a human gesture:

- hum a hook
- tap a melody
- click a rhythm
- use a breath pulse
- make a switch-style selection

Lilt turns that intent into:

- a structured JSON contract
- readable `.lilt` music code
- a Standard MIDI file
- Tone.js browser playback data

The public demo is static and safe to share. It lets people record, tap a
melody, choose instruments, inspect the generated Lilt text, and understand the
sound alphabet.

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
access. The architecture leaves room for a local Gemma runtime later.

### What Makes It Different

Lilt is not a chatbot that talks about music. It is a compiler pipeline for
musical intent:

1. capture a sound or gesture
2. extract timing and pitch facts
3. ask Gemma 4 to turn those facts into structured music JSON
4. validate the JSON
5. emit `.lilt`, MIDI, and browser playback

The result is an artifact people can keep working with. A musician can import
the MIDI into GarageBand, Ableton, Logic, MuseScore, or an assistive music rig.
A collaborator can edit the `.lilt` text in a pull request. A screen-reader
user can review the musical idea as plain text.

### Accessibility

The accessibility goal is musical agency.

Lilt is designed for people who may be autistic, non-speaking, motor-limited,
fatigued, blind, screen-reader-dependent, or unable to operate a traditional
DAW. Voice is useful, but voice is not required.

The browser demo includes:

- recording for hums or other sounds
- tap-to-melody input
- keyboard-reachable buttons
- plain text output
- instrument selection
- no tracking or analytics
- local recording playback

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

### How Collaboration Works

Because Lilt is text, musical collaboration can happen in the same way code
collaboration happens.

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
- fake backend for offline tests
- Gemini/Gemma backend for hosted model use
- accessibility notes and test plan

### What Works Today

- Record UI and local playback in supported browsers
- Tap-to-melody input
- Instrument selection
- Example playback through Tone.js
- JSON -> `.lilt`
- JSON -> `.mid`
- JSON -> Tone.js
- WAV -> digest JSON
- audio + digest + backend -> JSON/Lilt/MIDI
- test suite

### Known Limits

The public GitHub Pages demo does not call Gemma directly because a browser
frontend cannot safely hold an API key. The Gemma API path is implemented for
local/server-side use. For judging, the public page demonstrates the user
experience and artifacts; the repo demonstrates the backend integration and
testable pipeline.

### Built With

- Gemma 4 via Gemini API path
- Python
- mido
- jsonschema
- Tone.js
- GitHub Pages

## Demo Script

1. Open https://brookehoward2008-droid.github.io/lilt/
2. Show the sentence: "Hum into readable music code."
3. Record a short sound, stop, and play it back.
4. Point out that the digest is a model receipt, not homework for the user.
5. Tap C, E, G in "Tap a melody"; show the generated Lilt source changing.
6. Change the instrument to Bell or Plucked string and play the taps.
7. Play the built-in demos.
8. Show "Why it is different."
9. Show "Build a song" with melody, pulse, and bass.
10. Show "Work with others" and the text diff.
11. Close with: Lilt makes musical ideas editable, portable, and accessible.

## Submission Checklist

- [ ] DEV post uses the Build With Gemma 4 template.
- [ ] Live demo link included.
- [ ] GitHub repo link included.
- [ ] Gemma 4 model named: `gemma-4-26b-a4b-it`.
- [ ] Explain why Gemma 4 is doing real work.
- [ ] Explain why public demo does not expose API key.
- [ ] Mention accessibility and non-speaking input.
- [ ] Mention outputs: `.lilt`, MIDI, Tone.js, digest JSON.
- [ ] Mention tests and code quality.
- [ ] Do not include API keys.
- [ ] Confirm participant/team eligibility before submitting.

## Judging Criteria Mapping

| Criterion | Lilt answer |
|---|---|
| Intentional Gemma 4 use | Gemma interprets audio/digest facts into schema-valid music JSON. |
| Technical implementation | Tested Python pipeline, schema validation, deterministic codegen, MIDI/Tone.js emitters. |
| Creativity/originality | A music accessibility compiler, not another chatbot or DAW clone. |
| Usability/UX | Record, tap, play, choose instruments, inspect readable output, send feedback. |
