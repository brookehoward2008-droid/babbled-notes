# Lilt — language spec (v0.1, draft)

A tiny line-oriented language. Designed so a 4B model can emit it reliably and a human can read and edit it without a manual.

Hard goals: ~15 keywords, line-oriented, comments allowed, deterministic compile to MIDI.

## A complete program

```lilt
# tempo and feel apply to everything below until changed
tempo 96
feel swung-eighths
key C major

voice piano:
  C4 E4 G4 / dotted
  rest 1
  G4~A4 hold

voice kick: x . . x . x . .

mood melancholy, dusty
```

That's the whole program — header, two voices, mood tag.

## Lexical rules

- Indentation is significant **inside `voice` blocks only**, like Python's `for` body.
- `#` to end of line is a comment.
- Tokens are whitespace-separated. A line break ends a statement.
- Identifiers are `kebab-case`.
- Note literals are pitch + octave: `C4`, `F#3`, `Bb5`. `~` is a glide between two pitches. `_` is a tied continuation. `.` is a rest of one beat unit. `x` is a hit (in drum voices only).

## File rules (determinism contract)

Lilt files are designed to be diff-friendly and git-native. The compiler honors:

- **Plain UTF-8, LF newlines** (no CRLF, no BOM).
- **Deterministic codegen.** Same JSON in → byte-identical text out, every time.
- **No embedded timestamps**, no run-dependent IDs, no auto-inserted comments.
- **Stable voice ordering** (the order voices appear in the input JSON is preserved).
- **Stable whitespace** — two spaces of indent inside voice blocks, single space between tokens, one trailing newline at end of file.

These rules are part of the language, not a code style — any future implementation must honor them or it is non-conforming.

## Top-level statements

| Statement | Form | Default | Notes |
|---|---|---|---|
| `tempo` | `tempo <bpm>` | `120` | integer 30–300 |
| `feel` | `feel <feel-name>` | `straight` | see Feels |
| `key` | `key <root> <mode>` | `C major` | mode ∈ `major, minor, dorian, mixolydian, lydian, phrygian, locrian, blues` |
| `mood` | `mood <tag>, <tag>, ...` | unset | freeform tags; the compiler maps known ones to dynamics/instrumentation |
| `voice` | `voice <name>:` | — | starts an indented block (notes or hits) |

## Feels

The named groove. Compiler maps each to a swing ratio + microtiming curve.

| Name | Swing ratio | Notes |
|---|---|---|
| `straight` | 1:1 | the boring default |
| `swung-eighths` | 2:1 on eighths | jazz/blues |
| `swung-sixteenths` | 2:1 on sixteenths | hip-hop, neo-soul |
| `dotted` | 3:1 | hard swing |
| `triplet` | triplet feel | shuffle |
| `loose` | random ±15 ms | human imprecision |
| `tight` | quantized | machine |

## Voice blocks

Two flavors, picked by what shows up in the body.

### Pitched voices

A sequence of bars. Each bar is a line. Notes within a line are space-separated and share that bar's beats equally unless overridden.

```lilt
voice piano:
  C4 E4 G4              # three quarter-note triad notes (4/4 → ¾ of the bar)
  G4 ~ A4 hold          # G glides to A, holds for the rest of the bar
  rest 1                # one beat of silence, then bar ends
  C5 / dotted           # one note, dotted-rhythm articulation
```

Per-note suffixes (space-separated):

| Suffix | Meaning |
|---|---|
| `hold` | sustain to end of bar |
| `_` | tie into the next note (no re-articulation) |
| `~ <note>` | glide to `<note>` over the remaining duration |
| `/ dotted` `/ staccato` `/ legato` `/ ghost` | articulation |
| `! soft` `! mf` `! loud` | dynamic |

### Drum voices

A single line per bar. Each character = one step. The default subdivision is sixteenth notes (16 chars/bar); `feel` and an optional `step` directive can change this.

```lilt
voice kick:  x . . x . x . . x . . x . x . .
voice hat:   x x x x x x x x x x x x x x x x
voice snare: . . . . x . . . . . . . x . . .
```

## Comments and free text

```lilt
# inline-style note: anything after # is ignored
mood # this also works as a way to leave the line "blank"
```

## Reserved words

`tempo feel key mood voice rest hold major minor dorian mixolydian lydian phrygian locrian blues`

Plus all feel names and articulation/dynamic suffixes.

## Compile target

The reference compiler emits:
1. **Standard MIDI File** (type 1, one track per voice).
2. **Tone.js JSON** (a list of `{time, note, duration, velocity, voice}` events) for in-browser playback.

That's it. No instruments are bound by the language — `mood` and `voice` names are hints to the player; the player picks the actual sound.

## What the language deliberately does NOT do

- No polyphony within a single voice. (Use multiple voices.)
- No ties across more than one bar.
- No nested expressions, no variables, no functions.
- No microtonality, no time-signature changes mid-program.

These are scoping decisions, not principles. v0.2 may revisit any of them.

## Three example programs

### 1. Hummed melody

User hums "Mary Had a Little Lamb" at a slow walking tempo.

```lilt
tempo 78
key C major
mood gentle, instructional

voice voice:
  E4 D4 C4 D4
  E4 E4 E4 hold
  D4 D4 D4 hold
  E4 G4 G4 hold
```

### 2. Beatboxed groove

User goes `boots-cats-boots-cats` with a swung tail.

```lilt
tempo 96
feel swung-sixteenths
mood loose, hip-hop

voice kick:  x . . . x . . . x . . . x . . .
voice snare: . . . . x . . . . . . . x . . .
voice hat:   . x . x . x . x . x . x . x . x
```

### 3. Plucked phrase

User plays a fingerpicked guitar line; DSP gets the notes, Gemma classifies the articulation.

```lilt
tempo 72
feel straight
key A minor
mood pensive, intimate

voice guitar:
  A3 C4 E4 / staccato
  G3 B3 D4 / staccato
  F3 A3 ~ G3 hold ! soft
```
