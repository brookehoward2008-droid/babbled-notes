"""Deterministic digest-to-Lilt seed translation tests."""

from __future__ import annotations

from lilt import schema, translate


def test_digest_to_seed_uses_pitch_trace_and_quality():
    digest = {
        "estimated_bpm": 96,
        "estimated_key": "D minor",
        "pitch_trace": ["D4", "F4", "A4"],
        "onsets": [0.0, 0.5, 1.0],
        "quality": {"level": "too_quiet"},
        "features": {"pitch_direction": "rising", "gesture_density": "moderate"},
    }

    data = translate.digest_to_seed(digest)

    schema.validate(data)
    assert data["tempo"] == 96
    assert data["key"] == {"root": "D", "mode": "minor"}
    assert "gentle" in data["mood"]
    events = data["voices"][0]["bars"][0]
    assert [event["pitch"] for event in events[:3]] == ["D4", "F4", "A4"]
    assert all(event["dynamic"] == "soft" for event in events[:3])


def test_digest_to_seed_uses_drum_voice_for_onsets_without_pitch():
    digest = {
        "duration_s": 1.2,
        "onsets": [0.0, 0.3, 0.6, 0.9],
        "quality": {"level": "usable"},
        "features": {"gesture_density": "dense"},
    }

    data = translate.digest_to_seed(digest)

    schema.validate(data)
    assert data["voices"][0]["kind"] == "drum"
    assert data["feel"] == "tight"
    assert data["voices"][0]["bars"][0][0]["t"] == "hit"
