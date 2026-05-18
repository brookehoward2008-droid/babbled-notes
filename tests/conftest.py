"""Shared fixtures.

The CANONICAL_EXAMPLE is the worked example from SCHEMA.MD section
"Worked example". Tests refer to it so the SCHEMA contract is honored.
"""

from __future__ import annotations

import pytest


@pytest.fixture
def canonical_example() -> dict:
    return {
        "tempo": 80,
        "feel": "straight",
        "key": {"root": "C", "mode": "major"},
        "mood": ["gentle", "intimate"],
        "voices": [
            {
                "name": "voice",
                "kind": "pitched",
                "instrument_hint": "soft-vocal-pad",
                "bars": [
                    [
                        {"t": "note", "pitch": "C4", "beats": 1, "dynamic": "soft"},
                        {"t": "note", "pitch": "E4", "beats": 1, "dynamic": "soft"},
                        {"t": "note", "pitch": "G4", "beats": 1, "dynamic": "soft", "hold": True},
                    ]
                ],
            }
        ],
    }


@pytest.fixture
def canonical_drum_example() -> dict:
    """A two-voice drum pattern (kick + snare), one bar each. Boots-cats."""
    return {
        "tempo": 96,
        "feel": "swung-sixteenths",
        "key": {"root": "C", "mode": "major"},
        "mood": ["loose", "playful"],
        "voices": [
            {
                "name": "kick",
                "kind": "drum",
                "instrument_hint": "kick",
                "bars": [
                    [
                        {"t": "hit"},
                        {"t": "skip"},
                        {"t": "skip"},
                        {"t": "skip"},
                        {"t": "hit"},
                        {"t": "skip"},
                        {"t": "skip"},
                        {"t": "skip"},
                    ]
                ],
            },
            {
                "name": "snare",
                "kind": "drum",
                "instrument_hint": "snare",
                "bars": [
                    [
                        {"t": "skip"},
                        {"t": "skip"},
                        {"t": "skip"},
                        {"t": "skip"},
                        {"t": "hit"},
                        {"t": "skip"},
                        {"t": "skip"},
                        {"t": "skip"},
                    ]
                ],
            },
        ],
    }
