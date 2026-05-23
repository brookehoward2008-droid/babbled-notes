# Babbled Notes

**Sound into music. Music into something editable.**

Babbled Notes is a research-informed, accessibility-first music tool built for
the DEV Gemma 4 Challenge. It turns hums, taps, breaths, clicks, beatbox
patterns, or switch-style choices into readable music code, MIDI, and browser
playback.

Live demo: https://brookehoward2008-droid.github.io/babbled-notes/

Submission package: [SUBMISSION.md](SUBMISSION.md)

Paste-ready DEV post: [DEV_POST.md](DEV_POST.md)

Presentation runbook: [PRESENTATION.md](PRESENTATION.md)

```text
one sound
  -> timing, pitch, quality, and gesture facts
  -> Gemma interpretation
  -> validated music JSON
  -> .lilt text, MIDI, Tone.js playback, Neural Bloom response
```

## The idea

Most music tools assume the user can operate small controls, understand music
theory, or speak clearly about what they want. Babbled Notes starts earlier:

**make one sound.**

The app listens for musical intent, not perfect performance. A hum can become a
note. A pause can become a rest. A tap can become pulse. A breath can become a
soft hit. The result stays editable as plain text so the user, a collaborator,
or a screen reader can inspect it.

Babbled Notes is not a medical device and does not diagnose or treat anyone. It
is a creative access tool built around a simple belief:

**being heard through music is a real form of voice.**

## Research frame

### Why sound matters for non-speaking users

Music is not processed in only one corner of the brain. Neuroscience research
connects music and musical emotion with auditory processing, reward, movement,
memory, attention, and limbic systems. Koelsch's review in *Nature Reviews
Neuroscience* describes music-evoked emotions across auditory, striatal,
fronto-insular, motor, and limbic networks.[1]

For autistic and minimally verbal users, this matters because music can offer a
communication channel that does not depend on ordinary speech output. A 2024
meta-analysis in *Frontiers in Psychology* reviewed 18 randomized controlled
trials with 1,457 children with autism spectrum disorder and found that music
therapy can support language communication and social skills.[2]

### Why hum plus tap matters

Auditory-Motor Mapping Training (AMMT) is especially relevant to Babbled Notes.
AMMT pairs intoned vocal sound with bimanual tapping, linking auditory and motor
systems. In a 2011 PLOS ONE proof-of-concept study, non-verbal children with
autism improved speech output after AMMT sessions.[3] A later PLOS ONE
controlled comparison reported stronger gains for AMMT than speech repetition
therapy in minimally verbal children with autism.[4]

Babbled Notes is not AMMT and does not claim therapy outcomes. The design
borrows the same practical insight:

**sound plus movement can be a powerful starting point for expression.**

### Why musical agency matters

Community music research with people with disabilities describes music-making as
a way to express voice, build social connection, and reduce isolation.[5] That
maps directly to Babbled Notes' product goal: the first playback should not feel
like a toy. It should feel like the user made something worth keeping.

The engagement loop is expression momentum:

1. make one sound
2. feel recognized
3. hear it become music
4. replay it with depth
5. change one thing
6. save the version that feels like you

## What Gemma does

DSP can measure timing, pitch, loudness, silence, and onsets. Gemma gives those
facts musical meaning.

Gemma can:

- translate a sound digest into schema-valid music JSON
- choose tempo, feel, key, mood, voices, notes, rests, dynamics, and articulation
- interpret vocal gestures such as hum, breath, whisper, click, tap, rise, fall,
  slide, held tone, call-response, and intentional silence
- create playback production plans for depth, space, reverb, humanization,
  velocity curve, repeat variation, and Neural Bloom response
- guide the user with one next musical move instead of overwhelming controls

Tone.js/Web Audio renders the browser sound. Gemma plans and interprets; the
compiler validates; the browser plays.

## Neural Bloom

The visual direction is **Gemma-like: structured, luminous, layered, and
pattern-forming.**

Neural Bloom starts as a quiet holographic brain in a tech, space, and
electricity scene. As the user's sound becomes music, electric paths, sparks,
stars, and signal lines grow through it.

| Musical signal | Neural Bloom response |
|---|---|
| low notes | base glow |
| high notes | upper sparks |
| rhythm | electric pulses |
| repeated motifs | stronger pathways |
| spatial playback | wider left/right glow |
| long held tones | steady luminous bands |

This is a creative-access metaphor, not a medical claim. The message is:

**your music creates activation, connection, and growth.**

## What it outputs

Babbled Notes turns one musical gesture into portable artifacts:

| Artifact | Purpose |
|---|---|
| `.lilt` | readable music code for editing, review, and collaboration |
| `.mid` | MIDI for GarageBand, Ableton, Logic, MuseScore, or assistive music rigs |
| Tone.js JSON | browser playback |
| digest JSON | timing, pitch, and quality receipt |
| playback plan JSON | depth, space, reverb, humanization, and variation |

## Sound alphabet

| Input | Musical meaning | `.lilt` output |
|---|---|---|
| hum or sung tone | pitched note | `C4 ! mf` |
| longer hum | held note | `G4 hold` |
| pause | rest | `rest 1` |
| tap, clap, or click | drum hit | `x` |
| soft breath or soft click | ghost/soft hit | `o` |
| rising pitch | glide or melodic rise | `C4 ~ E4` |
| loud sound | stronger dynamic | `! loud` |
| short clipped sound | articulation | `/ staccato` |

The same alphabet can be driven by recording, touch, keyboard focus, or
assisted selection. Speech is useful, but speech is not required.

## Browser demo

The static GitHub Pages demo includes:

- Neural Bloom reactive scene
- recording for hums and other sounds
- recording quality hints
- starter `.lilt` code from the recording
- **Use in Compose** bridge from recording to editable music
- tap-to-melody input
- instrument choices
- composer workspace
- Bach, Mozart, Beethoven, and Chopin style buttons
- Center, Room, and Concert Hall sound spaces
- playback-depth receipt: depth, space, and motion feel without sliders
- Play Forever loop for expression momentum
- optional user feedback export

The public browser demo does not expose an API key. Gemma and Gemini TTS paths
run locally or server-side.

## Architecture

```text
audio / tap / switch input
        |
        v
browser or CLI digest
        |
        v
Gemma backend or deterministic fallback
        |
        v
strict JSON schema validation
        |
        +--> .lilt readable music code
        +--> .mid MIDI file
        +--> Tone.js event data
        +--> playback depth plan
        +--> Neural Bloom visual response
```

The compiler boundary matters. Gemma is allowed to be creative, but the output
must pass the schema before it becomes a usable artifact.

## Example `.lilt`

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

Because the song is text, collaboration can happen like code review:

```diff
- voice bass:
-   C2 hold ! soft
+ voice bass:
+   C2 ! soft G1 ! soft C2 hold ! mf
```

## Quick start

```powershell
cd C:\Users\toddl\OneDrive\Documents\GitHub\babbled-notes
$env:PYTHONPATH = "src"
python -m pytest
```

Compile an existing JSON music contract:

```powershell
$env:PYTHONPATH = "src"
python -m lilt.cli compile examples\three_note_hum.json
python -m lilt.cli tonejs examples\three_note_hum.json
python -m lilt.cli info examples\three_note_hum.json
```

Turn a WAV directly into editable music artifacts without any model call:

```powershell
$env:PYTHONPATH = "src"
python -m lilt.cli sketch path\to\clip.wav --output-base out\my-first-idea
```

That writes:

- `my-first-idea.digest.json`
- `my-first-idea.json`
- `my-first-idea.lilt`
- `my-first-idea.mid`

Run the hosted Gemma path:

```powershell
pip install -e .[gemini]
# Set GOOGLE_API_KEY in your local shell before running this.
$env:PYTHONPATH = "src"
python -m lilt.cli audio path\to\clip.wav --digest examples\three_note_hum.digest.json --backend gemini
```

Create a playback depth plan:

```powershell
$env:PYTHONPATH = "src"
python -m lilt.cli playback-plan examples\three_note_hum.json --style chopin --space concert-hall
python -m lilt.cli playback-plan examples\three_note_hum.json --style chopin --space concert-hall --dry-run-prompt
```

Render an AI voice prompt or local/server-side WAV:

```powershell
$env:PYTHONPATH = "src"
python -m lilt.cli voice examples\three_note_hum.json --style chopin --dry-run-prompt

pip install -e .[gemini]
# Set GEMINI_API_KEY in your local shell before running this.
python -m lilt.cli voice examples\three_note_hum.json --style chopin -o examples\three_note_hum.voice.wav
```

## Rebuild demo data

```powershell
$env:PYTHONPATH = "src"
python -m lilt.cli demo-data
```

Then open `docs/index.html`, or use the published GitHub Pages demo:

https://brookehoward2008-droid.github.io/babbled-notes/

## Package prep

```powershell
$env:PYTHONPATH = "src"
python -m pytest
python -m ruff check src tests
node --check docs/composer.js
node --check docs/player.js
node --check docs/voice-control.js
node --check docs/meadow.js
node --check docs/recorder.js
node --check docs/accessible.js
node --check docs/backdrop.js
git diff --check
$secretPattern = "AI" + "za|sk-[A-Za-z0-9]|" + "GEMINI_API_KEY\\s*=|" + "GOOGLE_API_KEY\\s*="
rg -n $secretPattern README.md SUBMISSION.md DEV_POST.md docs src tests pyproject.toml
python -m build
```

Keep API keys in the local shell or deployment secrets, never in the static
demo.

## Current verification

- Local tests: `97 passed, 1 skipped`
- Ruff: passed
- JavaScript syntax checks: passed
- Package build: passed
- Secret scan: no API keys found
- Live GitHub Pages smoke: Neural Bloom, Use in Compose, playback receipt, 4
  styles, and 3 sound spaces present

## Research sources

1. Koelsch S. *Brain correlates of music-evoked emotions.* Nature Reviews
   Neuroscience. 2014. DOI: [10.1038/nrn3666](https://doi.org/10.1038/nrn3666)
2. Shi Z, Wang S, Chen M, Hu A, Long Q, Lee Y. *The effect of music therapy on
   language communication and social skills in children with autism spectrum
   disorder: a systematic review and meta-analysis.* Frontiers in Psychology.
   2024. DOI: [10.3389/fpsyg.2024.1336421](https://doi.org/10.3389/fpsyg.2024.1336421)
3. Wan CY, Bazen L, Baars R, et al. *Auditory-Motor Mapping Training as an
   Intervention to Facilitate Speech Output in Non-Verbal Children with Autism:
   A Proof of Concept Study.* PLOS ONE. 2011. DOI:
   [10.1371/journal.pone.0025505](https://doi.org/10.1371/journal.pone.0025505)
4. Chenausky K, Norton A, Tager-Flusberg H, Schlaug G. *Auditory-Motor Mapping
   Training: Comparing the Effects of a Novel Speech Treatment to a Control
   Treatment for Minimally Verbal Children with Autism.* PLOS ONE. 2016. DOI:
   [10.1371/journal.pone.0164930](https://doi.org/10.1371/journal.pone.0164930)
5. MacGlone UM, Vamvakaris J, Wilson GB, MacDonald RAR. *Understanding the
   Wellbeing Effects of a Community Music Program for People With Disabilities:
   A Mixed Methods, Person-Centered Study.* Frontiers in Psychology. 2020. DOI:
   [10.3389/fpsyg.2020.588734](https://doi.org/10.3389/fpsyg.2020.588734)
