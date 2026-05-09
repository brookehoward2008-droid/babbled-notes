# Accessibility

Lilt is being designed so that accessibility is a property of the architecture, not a feature added later. This document captures the structural advantages, the honest limits, and the specific design choices we are committing to before any code is written.

## Why the bones are accessible

- **Audio gestures replace GUI manipulation.** Piano rolls, DAW timelines, and mouse-dragged note editing are exclusionary by default. Humming, whistling, beatboxing, sustained breath, lip clicks — any audible gesture is a valid input. Users with limited fine motor control, tremor, missing limbs, or fatigue conditions are not blocked out.
- **The compiled program is plain text.** Lilt source is ASCII, line-oriented, and screen-reader-friendly. A blind musician can record a phrase, hear (or have read aloud) the resulting Lilt program, and edit it by editing text — a workflow blind programmers have already mastered. This is the part of the design that most existing DAWs cannot retrofit.
- **No music-notation literacy required.** Lilt's keywords are English words. Dyslexia, learning differences, or simply not having had music education are not gating factors.
- **Runs locally on cheap edge hardware.** Gemma 4 E4B on a Raspberry Pi 5, a phone, or an old laptop. No subscription, no cloud account, no internet dependency. Disproportionately important for users on fixed incomes and in low-connectivity contexts.
- **MIDI is a first-class output.** Plugs into existing assistive music setups: eye-tracker MIDI controllers, breath controllers, sip-and-puff interfaces, single-switch scanning rigs.

## Where Lilt does not reach (honest limits)

- **Deaf and hard-of-hearing users** can author Lilt text directly and emit MIDI, but cannot audition outputs by ear. We can mitigate (see below) — we cannot solve this end-to-end.
- **Users with severe voice/speech disability** cannot use the audio frontend. The text frontend still works: Lilt is small enough to write by hand. We will not require audio input.
- **Cognitive accessibility** is bounded by the DSL itself. The grammar is small, but it is still a grammar. Users with significant cognitive disability may need a second, simpler UI on top.

## Design commitments

These are cheap to honor at the design-doc stage and prohibitively expensive to retrofit. They are part of the contract for v0.1.

### 1. Lilt source is a first-class UI surface

The text editor showing the Lilt program is the primary interface, not a debug view. The screen-reader experience is designed before the visual experience. There is no "advanced mode" for the text — the text is the program.

### 2. Any audible gesture counts as input

Not just pitched humming. The DSP layer accepts:

- single sustained tones
- breath, hisses, lip clicks, beatbox
- claps, taps, percussive vocalizations
- non-pitched gestures of any kind

Gemma's prompt explicitly handles non-melodic input and emits a coherent (possibly drum-only, possibly single-event) Lilt program rather than failing.

### 3. Plain-English description alongside Lilt source

Every compile emits two artifacts: the Lilt program, and a 1–2 sentence English description (`"a slow, three-note ascending hum, gentle and intimate"`). Two reasons:

- helps cognitively diverse, dyslexic, and non-musical users verify what was heard
- gives screen-reader users a fast summary before they dive into the source

This is added to the Gemma 4 JSON schema as a required `description` field.

### 4. Visual playback for deaf users

A piano-roll-style preview rendered **from the Lilt program**, not the original audio waveform. Reading the text and seeing a deterministic picture of what would play closes the loop for deaf users without requiring sound.

### 5. Single-gesture input is valid

One sustained tone or one breath compiles to a valid (tiny) Lilt program. No minimum-duration or minimum-content requirements. Users with very limited motor control or short breath capacity are first-class users, not edge cases.

### 6. No color-only meaning

All semantic information is conveyed by text or shape as well as color. The UI works in high-contrast and grayscale. Color reinforces; it never carries unique meaning.

### 7. Keyboard-only operation is a hard requirement

Every interaction (record, stop, compile, edit, play, save, share) is reachable by keyboard alone, with visible focus indicators. No "mouse-only" gestures.

### 8. Predictable, slow, captioned playback

Audio playback respects an adjustable rate (0.5×–2×). All non-text feedback (record start/stop, compile success, errors) has a textual equivalent surfaced to the screen reader.

### 9. The audio prompt is non-judgmental

Gemma's system prompt explicitly tells the model not to comment on the user's musical skill, voice quality, or accuracy. It describes the gesture; it does not grade it. Important for users whose voice or breath is shaped by disability.

## Standards we aim to meet

- **WCAG 2.2 AA** for any web UI (contrast, focus, keyboard, ARIA labeling).
- **Section 508** alignment for the desktop / Pi build.
- **No autoplay audio**, no flashing > 3 Hz, no motion that cannot be disabled.

## Out of scope for v0.1 (named, not forgotten)

- Speech-to-text DSL editing ("change tempo to 80") — promising for users who can speak but not type, but adds another model. Park for v0.2.
- Internationalization of mood and feel vocabulary — currently English-only. Park for v0.2.
- Haptic playback for deaf users via a vibrotactile device — interesting, hardware-dependent. Park.

## How to test

Each pull request that touches user-facing surfaces must verify, at minimum:

1. Tab through the entire UI with no mouse — every action reachable.
2. Run NVDA / VoiceOver / Orca through the recording → compile → edit → play loop.
3. Toggle to grayscale and confirm no information is lost.
4. Run a single 0.4-second breath as input; confirm it produces a valid Lilt program with a sensible description.
5. Render a Lilt program with the audio path muted; confirm the visual playback alone is sufficient to understand what would play.

## Why this belongs in a Gemma 4 submission

The DEV brief weights "creativity, originality, and UX." Most Gemma 4 builds will be chatbots, agents, or creative-writing helpers. A music tool that also happens to be one of the more accessible AI music interfaces — because edge-deployed, audio-native, structured-output Gemma 4 makes that possible — is a more memorable submission than another voice DAW. Accessibility here is not a separate axis; it is what the model unlocked.
