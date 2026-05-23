"""Vocal gesture library tests."""

from __future__ import annotations

from lilt import vocal


def test_vocal_library_contains_accessible_gesture_depth():
    names = {entry["name"] for entry in vocal.VOCAL_GESTURES}

    assert len(vocal.VOCAL_GESTURES) >= 24
    assert {"hum", "ah", "ooh", "la", "breath", "click", "clap", "slide", "trill"} <= names


def test_prompt_block_is_compact_and_schema_safe():
    block = vocal.prompt_block()

    assert "VOCAL GESTURE LIBRARY" in block
    assert "Do not invent schema fields" in block
    assert "hum -> pitched note" in block
    assert "breath -> soft ghost hit or rest" in block
    assert len(block) < 5000


def test_gesture_lookup_exposes_mapping_terms():
    hum = vocal.gesture_by_name("hum")
    breath = vocal.gesture_by_name("breath")

    assert hum["maps_to"] == "pitched note"
    assert "legato" in hum["music_hint"]
    assert breath["maps_to"] == "soft ghost hit or rest"
