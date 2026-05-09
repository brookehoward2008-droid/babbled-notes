"""The JSON schema Gemma 4 must conform to.

Mirrors `SCHEMA.md`. The schema is the contract between the model and the
codegen layer; nothing in the codegen accepts data that does not validate.
"""

from __future__ import annotations

import jsonschema

ROOTS = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F",
         "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"]
MODES = ["major", "minor", "dorian", "mixolydian",
         "lydian", "phrygian", "locrian", "blues"]
FEELS = ["straight", "swung-eighths", "swung-sixteenths",
         "dotted", "triplet", "loose", "tight"]
MOODS = ["gentle", "urgent", "melancholy", "bright", "dusty", "plucky",
         "anthemic", "intimate", "loose", "tight", "hypnotic", "sparse",
         "dense", "warm", "cold", "playful", "pensive"]
ARTICULATIONS = ["dotted", "staccato", "legato", "ghost"]
DYNAMICS = ["soft", "mf", "loud"]
EVENT_TYPES = ["note", "rest", "hit", "skip"]
VOICE_KINDS = ["pitched", "drum"]

LILT_JSON_SCHEMA: dict = {
    "$schema": "<https://json-schema.org/draft/2020-12/schema>",
    "type": "object",
    "required": ["tempo", "feel", "key", "mood", "voices"],
    "additionalProperties": False,
    "properties": {
        "tempo": {"type": "integer", "minimum": 30, "maximum": 300},
        "feel": {"enum": FEELS},
        "key": {
            "type": "object",
            "required": ["root", "mode"],
            "additionalProperties": False,
            "properties": {
                "root": {"enum": ROOTS},
                "mode": {"enum": MODES},
            },
        },
        "mood": {
            "type": "array",
            "minItems": 1,
            "maxItems": 3,
            "items": {"enum": MOODS},
        },
        "description": {"type": "string", "maxLength": 240},
        "voices": {
            "type": "array",
            "minItems": 1,
            "maxItems": 3,
            "items": {"$ref": "#/$defs/voice"},
        },
        "dsp_override": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "reason": {"type": "string", "maxLength": 120},
                "tempo": {"type": "integer"},
                "key": {"$ref": "#/properties/key"},
            },
        },
    },
    "$defs": {
        "voice": {
            "type": "object",
            "required": ["name", "kind", "instrument_hint", "bars"],
            "additionalProperties": False,
            "properties": {
                "name": {"type": "string", "pattern": "^[a-z][a-z0-9-]{0,15}$"},
                "kind": {"enum": VOICE_KINDS},
                "instrument_hint": {"type": "string", "maxLength": 64},
                "bars": {
                    "type": "array",
                    "minItems": 1,
                    "maxItems": 16,
                    "items": {
                        "type": "array",
                        "items": {"$ref": "#/$defs/event"},
                    },
                },
            },
        },
        "event": {
            "type": "object",
            "required": ["t"],
            "additionalProperties": False,
            "properties": {
                "t": {"enum": EVENT_TYPES},
                "pitch": {"type": "string", "pattern": "^[A-G](#|b)?[0-8]$"},
                "glide_to": {"type": "string", "pattern": "^[A-G](#|b)?[0-8]$"},
                "tied": {"type": "boolean"},
                "hold": {"type": "boolean"},
                "articulation": {"enum": ARTICULATIONS},
                "dynamic": {"enum": DYNAMICS},
                "beats": {"type": "number", "minimum": 0.0625, "maximum": 16},
            },
        },
    },
}


def validate(data: dict) -> None:
    """Raise jsonschema.ValidationError if data does not conform."""
    jsonschema.validate(data, LILT_JSON_SCHEMA)


def is_valid(data: dict) -> bool:
    try:
        validate(data)
    except jsonschema.ValidationError:
        return False
    return True
