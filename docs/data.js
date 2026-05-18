/**
 * Embedded demo data. Each entry has:
 *   id           kebab-case slug, also the picker button label key
 *   title        short label shown in the picker
 *   lilt_source  exact text of the .lilt file (what the compiler emits)
 *   payload      the Tone.js event payload (output of `lilt tonejs`)
 *
 * This file is regenerable from the repo's examples/ directory. Keep
 * the contents in sync after editing any example JSON.
 */
window.LILT_DEMOS = [
  {
    id: "three-note-hum",
    title: "Three-note hum",
    lilt_source: "# a slow, three-note ascending hum, gentle and intimate\n" +
      "\n" +
      "tempo 80\n" +
      "feel straight\n" +
      "key C major\n" +
      "\n" +
      "mood gentle, intimate\n" +
      "\n" +
      "voice voice:\n" +
      "  C4 ! soft E4 ! soft G4 hold ! soft\n",
    payload: {
      tempo: 80,
      feel: "straight",
      key: { root: "C", mode: "major" },
      mood: ["gentle", "intimate"],
      total_seconds: 3.0,
      description: "a slow, three-note ascending hum, gentle and intimate",
      voices: [
        {
          name: "voice",
          kind: "pitched",
          instrument_hint: "soft-vocal-pad",
          events: [
            { time: 0.0, note: "C4", duration: 0.75, velocity: 0.4 },
            { time: 0.75, note: "E4", duration: 0.75, velocity: 0.4 },
            { time: 1.5, note: "G4", duration: 1.5, velocity: 0.4 }
          ]
        }
      ]
    }
  },
  {
    id: "mary-had-a-little-lamb",
    title: "Mary Had a Little Lamb",
    lilt_source: "# Mary Had a Little Lamb at a slow, walking tempo\n" +
      "\n" +
      "tempo 78\n" +
      "feel straight\n" +
      "key C major\n" +
      "\n" +
      "mood gentle, playful\n" +
      "\n" +
      "voice voice:\n" +
      "  E4 ! soft D4 ! soft C4 ! soft D4 ! soft\n" +
      "  E4 ! soft E4 ! soft E4 hold ! soft\n" +
      "  D4 ! soft D4 ! soft D4 hold ! soft\n" +
      "  E4 ! soft G4 ! soft G4 hold ! soft\n",
    payload: {
      tempo: 78,
      feel: "straight",
      key: { root: "C", mode: "major" },
      mood: ["gentle", "playful"],
      total_seconds: 12.307692,
      description: "Mary Had a Little Lamb at a slow, walking tempo",
      voices: [
        {
          name: "voice",
          kind: "pitched",
          instrument_hint: "soft-vocal-pad",
          events: [
            { time: 0.0,        note: "E4", duration: 0.769231, velocity: 0.4 },
            { time: 0.769231,   note: "D4", duration: 0.769231, velocity: 0.4 },
            { time: 1.538462,   note: "C4", duration: 0.769231, velocity: 0.4 },
            { time: 2.307692,   note: "D4", duration: 0.769231, velocity: 0.4 },
            { time: 3.076923,   note: "E4", duration: 0.769231, velocity: 0.4 },
            { time: 3.846154,   note: "E4", duration: 0.769231, velocity: 0.4 },
            { time: 4.615385,   note: "E4", duration: 1.538462, velocity: 0.4 },
            { time: 6.153846,   note: "D4", duration: 0.769231, velocity: 0.4 },
            { time: 6.923077,   note: "D4", duration: 0.769231, velocity: 0.4 },
            { time: 7.692308,   note: "D4", duration: 1.538462, velocity: 0.4 },
            { time: 9.230769,   note: "E4", duration: 0.769231, velocity: 0.4 },
            { time: 10.0,       note: "G4", duration: 0.769231, velocity: 0.4 },
            { time: 10.769231,  note: "G4", duration: 1.538462, velocity: 0.4 }
          ]
        }
      ]
    }
  },
  {
    id: "boots-cats",
    title: "Boots-cats groove",
    lilt_source: "# a swung boots-cats groove on kick, snare, and closed hat\n" +
      "\n" +
      "tempo 96\n" +
      "feel swung-sixteenths\n" +
      "key C major\n" +
      "\n" +
      "mood loose, playful\n" +
      "\n" +
      "voice kick:\n" +
      "  x . . . x . . . x . . . x . . .\n" +
      "\n" +
      "voice snare:\n" +
      "  . . . . x . . . . . . . x . . .\n" +
      "\n" +
      "voice hat:\n" +
      "  . x . x . x . x . x . x . x . x\n",
    payload: {
      tempo: 96,
      feel: "swung-sixteenths",
      key: { root: "C", mode: "major" },
      mood: ["loose", "playful"],
      total_seconds: 2.5,
      description: "a swung boots-cats groove on kick, snare, and closed hat",
      voices: [
        {
          name: "kick",
          kind: "drum",
          instrument_hint: "kick",
          events: [
            { time: 0.0,     note: "kick", duration: 0.1, velocity: 0.65 },
            { time: 0.625,   note: "kick", duration: 0.1, velocity: 0.65 },
            { time: 1.25,    note: "kick", duration: 0.1, velocity: 0.65 },
            { time: 1.875,   note: "kick", duration: 0.1, velocity: 0.65 }
          ]
        },
        {
          name: "snare",
          kind: "drum",
          instrument_hint: "snare",
          events: [
            { time: 0.625,   note: "snare", duration: 0.1, velocity: 0.65 },
            { time: 1.875,   note: "snare", duration: 0.1, velocity: 0.65 }
          ]
        },
        {
          name: "hat",
          kind: "drum",
          instrument_hint: "closed-hat",
          events: [
            { time: 0.15625,  note: "closed-hat", duration: 0.1, velocity: 0.65 },
            { time: 0.46875,  note: "closed-hat", duration: 0.1, velocity: 0.65 },
            { time: 0.78125,  note: "closed-hat", duration: 0.1, velocity: 0.65 },
            { time: 1.09375,  note: "closed-hat", duration: 0.1, velocity: 0.65 },
            { time: 1.40625,  note: "closed-hat", duration: 0.1, velocity: 0.65 },
            { time: 1.71875,  note: "closed-hat", duration: 0.1, velocity: 0.65 },
            { time: 2.03125,  note: "closed-hat", duration: 0.1, velocity: 0.65 },
            { time: 2.34375,  note: "closed-hat", duration: 0.1, velocity: 0.65 }
          ]
        }
      ]
    }
  }
];
