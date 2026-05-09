# Gemma 4 contract — prompt + JSON schema (v0.1, draft)

What Gemma 4 E4B receives, what it must emit, and why each field exists.

## Inputs to Gemma

A single multimodal turn:

1. **Audio** — the user's recording (mono, 16 kHz, ≤ 12 seconds for v0.1).
2. **DSP digest** — JSON pre-computed by the classical layer:
   ```json
   {
     "duration_s": 6.4,
     "estimated_bpm": 94,
     "estimated_key": "C major",
     "onsets_s": [0.00, 0.51, 1.02, 1.53, 2.04, 3.55, 4.06],
     "pitches_hz": [261.6, 329.6, 392.0, 392.0, 440.0, 0.0, 0.0],
     "rms_curve": [0.12, 0.34, 0.48, 0.42, 0.39, 0.05, 0.04]
   }
   ```
3. **System prompt** — see below.

DSP gives Gemma the *facts* (notes, beat). Gemma adds the *meaning* (groove, articulation, mood, instrumentation).

## System prompt

```
You are Lilt's audio compiler frontend. You receive an audio clip plus a DSP
digest extracted from it. Your job is to emit ONE JSON object that captures
both the literal content and the musical character of the clip.

Rules:

1. Output ONLY the JSON object. No prose, no markdown fences, no comments.
2. Conform exactly to the provided schema. Do not invent fields.
3. Trust the DSP digest for pitches, onsets, and tempo. Do not contradict it
   unless you can clearly hear it is wrong; in that case, set
   "dsp_override.reason" with a short explanation and emit your corrected
   values.
4. Choose feel, articulation, dynamics, mood, and instrument_hint by LISTENING
   to the audio. These are your job, not the DSP's.
5. If the input is monophonic (one voice at a time), produce one voice.
   If the input is clearly drums, produce one drum voice. If both are present,
   produce up to three voices total.
6. Never output more than 16 bars.
7. mood: 1–3 short tags from this allowed set:
   gentle, urgent, melancholy, bright, dusty, plucky, anthemic, intimate,
   loose, tight, hypnotic, sparse, dense, warm, cold, playful, pensive.
8. Use only feels from: straight, swung-eighths, swung-sixteenths, dotted,
   triplet, loose, tight.
9. Use only articulations from: dotted, staccato, legato, ghost.
10. Use only dynamics from: soft, mf, loud.
```

## Output JSON schema (informal)

```json
{
  "$schema": "<https://json-schema.org/draft/2020-12/schema>",
  "type": "object",
  "required": ["tempo", "feel", "key", "mood", "voices"],
  "additionalProperties": false,
  "properties": {
    "tempo": { "type": "integer", "minimum": 30, "maximum": 300 },
    "feel": {
      "enum": ["straight", "swung-eighths", "swung-sixteenths",
               "dotted", "triplet", "loose", "tight"]
    },
    "key": {
      "type": "object",
      "required": ["root", "mode"],
      "properties": {
        "root": { "enum": ["C","C#","Db","D","D#","Eb","E","F",
                           "F#","Gb","G","G#","Ab","A","A#","Bb","B"] },
        "mode": { "enum": ["major","minor","dorian","mixolydian",
                           "lydian","phrygian","locrian","blues"] }
      }
    },
    "mood": {
      "type": "array",
      "minItems": 1,
      "maxItems": 3,
      "items": {
        "enum": ["gentle","urgent","melancholy","bright","dusty","plucky",
                "anthemic","intimate","loose","tight","hypnotic","sparse",
                "dense","warm","cold","playful","pensive"]
      }
    },
    "voices": {
      "type": "array",
      "minItems": 1,
      "maxItems": 3,
      "items": { "$ref": "#/$defs/voice" }
    },
    "dsp_override": {
      "type": "object",
      "properties": {
        "reason": { "type": "string", "maxLength": 120 },
        "tempo": { "type": "integer" },
        "key": { "$ref": "#/properties/key" }
      }
    }
  },
  "$defs": {
    "voice": {
      "type": "object",
      "required": ["name", "kind", "instrument_hint", "bars"],
      "properties": {
        "name": { "type": "string", "pattern": "^[a-z][a-z0-9-]{0,15}$" },
        "kind": { "enum": ["pitched", "drum"] },
        "instrument_hint": {
          "type": "string",
          "description": "Free-form, e.g. 'rhodes', 'plucked-guitar', 'breathy-flute', 'kick', 'closed-hat'"
        },
        "bars": {
          "type": "array",
          "minItems": 1,
          "maxItems": 16,
          "items": { "type": "array", "items": { "$ref": "#/$defs/event" } }
        }
      }
    },
    "event": {
      "type": "object",
      "required": ["t"],
      "properties": {
        "t": { "enum": ["note", "rest", "hit", "skip"] },
        "pitch": { "type": "string", "description": "C4, F#3, Bb5; required for note events" },
        "glide_to": { "type": "string" },
        "tied": { "type": "boolean" },
        "hold": { "type": "boolean" },
        "articulation": { "enum": ["dotted","staccato","legato","ghost"] },
        "dynamic": { "enum": ["soft","mf","loud"] },
        "beats": { "type": "number", "minimum": 0.0625, "maximum": 16 }
      }
    }
  }
}
```

## Worked example

**Input.** User hums an ascending C-major triad over 3 seconds, gently, no rhythm to speak of.

**DSP digest.**
```json
{ "duration_s": 3.1, "estimated_bpm": 80, "estimated_key": "C major",
  "onsets_s": [0.05, 1.05, 2.05], "pitches_hz": [261.6, 329.6, 392.0],
  "rms_curve": [0.18, 0.22, 0.20] }
```

**Gemma output (target).**
```json
{
  "tempo": 80,
  "feel": "straight",
  "key": { "root": "C", "mode": "major" },
  "mood": ["gentle", "intimate"],
  "voices": [
    {
      "name": "voice",
      "kind": "pitched",
      "instrument_hint": "soft-vocal-pad",
      "bars": [
        [
          { "t": "note", "pitch": "C4", "beats": 1, "dynamic": "soft" },
          { "t": "note", "pitch": "E4", "beats": 1, "dynamic": "soft" },
          { "t": "note", "pitch": "G4", "beats": 1, "dynamic": "soft", "hold": true }
        ]
      ]
    }
  ]
}
```

**Codegen → Lilt source.**
```lilt
tempo 80
feel straight
key C major
mood gentle, intimate

voice voice:
  C4 E4 G4 hold ! soft
```

## Why each Gemma-only field earns its place

| Field | Why DSP can't do it |
|---|---|
| `feel` | Groove names are perceptual categories, not measurements. |
| `mood` | Same — emotional category requires audio understanding. |
| `instrument_hint` | "Plucky vs. legato vs. breathy" is timbre, which DSP could attempt but Gemma names better in one shot. |
| `articulation` per event | Same. |
| `dynamic` per event | DSP gives RMS curves; Gemma maps them to coarse labels (`soft/mf/loud`) the way a musician would. |
| `dsp_override` | Sanity-check escape hatch: if Gemma clearly hears something DSP missed (pickup beat, off-by-octave error), it can flag and correct. |

## What still needs validating

- Does Gemma 4 E4B actually adhere to this schema reliably without a separate JSON-mode harness? Test plan: 30 short clips spanning humming, beatboxing, plucked guitar, piano. Score: schema-valid rate, semantic accuracy of `feel`/`mood`/`articulation`.
- Does the audio modality work locally via llama.cpp on the day this is built, or do we need to fall back to Gemini API for the audio path while keeping the model identifier as Gemma 4 E4B?
- Latency: target end-to-end ≤ 8 seconds for a 6-second clip on a Pi 5. Otherwise we drop to E2B.
