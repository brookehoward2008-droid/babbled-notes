"""Vocal gesture library for translating human sounds into Lilt events."""

from __future__ import annotations

VOCAL_GESTURES: list[dict[str, str]] = [
    {
        "name": "hum",
        "heard_as": "closed-mouth steady pitch",
        "maps_to": "pitched note",
        "music_hint": "legato, warm, use pitch_trace and hold for sustained hums",
    },
    {
        "name": "ah",
        "heard_as": "open vowel tone",
        "maps_to": "pitched note",
        "music_hint": "clear melodic note, mf unless very quiet",
    },
    {
        "name": "ooh",
        "heard_as": "rounded soft vowel",
        "maps_to": "pitched note",
        "music_hint": "soft or intimate, often legato",
    },
    {
        "name": "ee",
        "heard_as": "bright narrow vowel",
        "maps_to": "pitched note",
        "music_hint": "bright, higher-energy, may be staccato if clipped",
    },
    {
        "name": "la",
        "heard_as": "sung syllable with clear attack",
        "maps_to": "pitched note",
        "music_hint": "melodic note with readable onset",
    },
    {
        "name": "na",
        "heard_as": "nasal sung syllable",
        "maps_to": "pitched note",
        "music_hint": "playful or intimate, use short notes if repeated",
    },
    {
        "name": "mm",
        "heard_as": "very soft hum",
        "maps_to": "pitched note",
        "music_hint": "soft dynamic, sparse mood, hold if sustained",
    },
    {
        "name": "breath",
        "heard_as": "unvoiced inhale or exhale",
        "maps_to": "soft ghost hit or rest",
        "music_hint": "ghost articulation, soft dynamic, or rest if mostly silence",
    },
    {
        "name": "whisper",
        "heard_as": "speech-like noise without stable pitch",
        "maps_to": "soft ghost hit or rest",
        "music_hint": "intimate mood, drum/texture voice only if rhythmic",
    },
    {
        "name": "click",
        "heard_as": "short mouth or tongue click",
        "maps_to": "drum hit",
        "music_hint": "staccato hit, tight feel if repeated",
    },
    {
        "name": "clap",
        "heard_as": "hand clap",
        "maps_to": "drum hit",
        "music_hint": "loud hit if high peak, otherwise mf",
    },
    {
        "name": "tap",
        "heard_as": "finger/table tap",
        "maps_to": "drum hit",
        "music_hint": "pulse voice, tight or straight feel",
    },
    {
        "name": "beatbox-kick",
        "heard_as": "low plosive beatbox sound",
        "maps_to": "drum hit",
        "music_hint": "low drum role, strong downbeat",
    },
    {
        "name": "beatbox-snare",
        "heard_as": "sharp noisy beatbox sound",
        "maps_to": "drum hit",
        "music_hint": "snare-like backbeat, staccato",
    },
    {
        "name": "beatbox-hat",
        "heard_as": "short high tss/ch sound",
        "maps_to": "drum hit",
        "music_hint": "light repeated subdivision, tight feel",
    },
    {
        "name": "slide",
        "heard_as": "smooth pitch movement",
        "maps_to": "pitched note with glide_to",
        "music_hint": "use glide_to when pitch_trace moves between stable notes",
    },
    {
        "name": "rise",
        "heard_as": "pitch moves upward",
        "maps_to": "pitched note with glide_to",
        "music_hint": "bright or hopeful contour",
    },
    {
        "name": "fall",
        "heard_as": "pitch moves downward",
        "maps_to": "pitched note with glide_to",
        "music_hint": "pensive or resolving contour",
    },
    {
        "name": "trill",
        "heard_as": "fast alternation between close pitches",
        "maps_to": "short repeated pitched notes",
        "music_hint": "playful, bright, repeated short events",
    },
    {
        "name": "vibrato",
        "heard_as": "sustained pitch with small wobble",
        "maps_to": "held pitched note",
        "music_hint": "hold true, legato articulation, warm or expressive",
    },
    {
        "name": "staccato",
        "heard_as": "short clipped voiced sound",
        "maps_to": "pitched note",
        "music_hint": "staccato articulation, shorter beats",
    },
    {
        "name": "held-tone",
        "heard_as": "long stable voiced sound",
        "maps_to": "held pitched note",
        "music_hint": "hold true, tied if it crosses a bar",
    },
    {
        "name": "call-response",
        "heard_as": "two separated phrases with a gap",
        "maps_to": "pitched notes and rests",
        "music_hint": "use rests between phrases, possibly two voices only if overlapping",
    },
    {
        "name": "question-ending",
        "heard_as": "phrase rises at the end",
        "maps_to": "melodic rise",
        "music_hint": "glide_to or final higher pitch, bright/pensive mood",
    },
    {
        "name": "answer-ending",
        "heard_as": "phrase settles downward",
        "maps_to": "melodic fall",
        "music_hint": "final lower pitch, gentle or warm mood",
    },
    {
        "name": "silence",
        "heard_as": "intentional pause",
        "maps_to": "rest",
        "music_hint": "preserve meaningful gaps as rests",
    },
]


def gesture_by_name(name: str) -> dict[str, str]:
    """Return a vocal gesture definition by name."""
    normalized = name.strip().lower()
    for entry in VOCAL_GESTURES:
        if entry["name"] == normalized:
            return entry
    raise KeyError(name)


def prompt_block() -> str:
    """Return a compact model prompt block for vocal gesture translation."""
    lines = [
        "VOCAL GESTURE LIBRARY:",
        "Use these mappings to translate human sound into the existing JSON schema.",
        "Do not invent schema fields; express everything through voices, events, dynamics, articulation, hold, tied, beats, and glide_to.",
    ]
    for entry in VOCAL_GESTURES:
        lines.append(
            f"- {entry['name']} -> {entry['maps_to']}; heard as {entry['heard_as']}; "
            f"music hint: {entry['music_hint']}."
        )
    return "\n".join(lines)
