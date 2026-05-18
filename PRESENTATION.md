# Lilt Presentation Runbook

## Goal

Show Lilt as an accessibility-first composing tool, not a music chatbot.

Core line:

> Lilt turns hums, taps, breaths, clicks, or switch-style input into editable
> music code, MIDI, and browser playback.

## Links

- Live demo: https://brookehoward2008-droid.github.io/lilt/?v=final
- Repo: https://github.com/brookehoward2008-droid/lilt
- Submission draft: SUBMISSION.md

## 3-Minute Demo

1. Open the live demo.
2. Say: "Most music tools start with a piano roll or DAW. Lilt starts with a human gesture."
3. Show **Record a hum**.
   - Record a short sound if the browser allows it.
   - If mic permission is awkward, skip recording and say the public page keeps audio local.
4. Show **Tap a melody**.
   - Tap C, E, G.
   - Point to the generated Lilt text.
   - Change the instrument to Bell or Plucked string.
   - Play the taps.
5. Show **Try a demo**.
   - Play Three-note hum.
   - Change instrument.
6. Show **Why it is different**.
   - `.lilt` is readable text.
   - MIDI works in DAWs and assistive music rigs.
7. Show **Build a song**.
   - Melody + pulse + bass.
8. Show **Work with others**.
   - The music can be reviewed as a text diff.
9. Close:
   - "Gemma 4 is the interpretation layer between sound/gesture and structured music code."

## 30-Second Pitch

Lilt is a music accessibility compiler. It lets someone express a musical idea
with a hum, tap, breath, click, or switch-style selection, then turns that idea
into readable `.lilt` source, MIDI, and browser playback. Gemma 4 does the
interpretive work: it maps timing, pitch, dynamics, and gesture into a structured
music schema. The result is portable, editable, and collaborative.

## What To Emphasize

- Voice is optional.
- Speech is not required.
- The output is useful outside the demo.
- The public page does not expose an API key.
- The repo contains the real backend path for Gemma.
- The static demo is intentionally safe and quota-proof.

## Questions And Answers

### Why not just use a DAW?

DAWs are powerful, but they often require fine motor control, tiny timelines,
and music-production knowledge. Lilt gives users a smaller first step: gesture
to readable music code.

### What does Gemma 4 actually do?

Gemma turns audio/digest facts into schema-valid musical meaning: tempo, key,
feel, mood, voices, notes, rests, hits, dynamics, and articulation.

### Why is the live demo not calling Gemma directly?

Because a public static frontend cannot safely hold an API key. The demo shows
the user experience and artifacts. The repo includes the Gemini/Gemma backend
for local or server-side use.

### How does this help non-speaking users?

The tap melody path, keyboard controls, and future switch scanning let users
place musical ideas without vocalizing. The same artifact model still applies:
text, MIDI, and playback.

### How can people collaborate?

They can share `.lilt` text, MIDI, or a GitHub diff. A collaborator can change a
bass line or drum pattern without forcing everyone into the same DAW.

## Final Submission Checklist

- [ ] Live demo link works.
- [ ] README links to SUBMISSION.md.
- [ ] DEV post includes live demo and repo.
- [ ] Model is named: `gemma-4-26b-a4b-it`.
- [ ] Explain why Gemma 4 is central.
- [ ] Explain static demo/API key safety.
- [ ] Mention accessibility and non-speaking users.
- [ ] Mention outputs: `.lilt`, MIDI, Tone.js, digest JSON.
- [ ] Mention tests.
- [ ] No API key in repo, post, screenshots, or demo.
