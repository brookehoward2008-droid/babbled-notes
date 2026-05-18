"""Tone.js event emitter tests.

INTEGRATIONS.MD: 'Tone.js JSON (a list of {time, note, duration, velocity,
voice} events) for in-browser playback.' Time is in seconds, velocity is
on Tone.js's 0..1 scale. Voices are grouped so the player can give each
voice its own synth.
"""

from __future__ import annotations

import math

from lilt import tonejs


def test_emit_returns_dict_with_voices_and_tempo(canonical_example):
    out = tonejs.emit(canonical_example)
    assert out["tempo"] == 80
    assert isinstance(out["voices"], list)
    assert len(out["voices"]) == 1


def test_pitched_voice_events_have_correct_pitches(canonical_example):
    """C4, E4, G4 from the canonical example are preserved as note names."""
    out = tonejs.emit(canonical_example)
    notes = [ev["note"] for ev in out["voices"][0]["events"]]
    assert notes == ["C4", "E4", "G4"]


def test_pitched_voice_event_times_are_sequential(canonical_example):
    """At 80 BPM, each beat is 0.75s. Notes start at 0, 0.75, 1.5."""
    out = tonejs.emit(canonical_example)
    times = [ev["time"] for ev in out["voices"][0]["events"]]
    spb = 60 / 80
    assert math.isclose(times[0], 0.0)
    assert math.isclose(times[1], spb)
    assert math.isclose(times[2], 2 * spb)


def test_hold_extends_duration(canonical_example):
    """Third note has hold=True. Duration covers to end of bar."""
    out = tonejs.emit(canonical_example)
    durations = [ev["duration"] for ev in out["voices"][0]["events"]]
    # C4 and E4 are 1 beat = 0.75s; G4 holds through beat 4 -> 2 beats = 1.5s
    spb = 60 / 80
    assert math.isclose(durations[0], spb)
    assert math.isclose(durations[1], spb)
    assert math.isclose(durations[2], 2 * spb)


def test_dynamic_maps_to_velocity_0_to_1(canonical_example):
    """soft=0.4, mf=0.65, loud=0.9. All three notes are soft."""
    out = tonejs.emit(canonical_example)
    velocities = [ev["velocity"] for ev in out["voices"][0]["events"]]
    assert all(math.isclose(v, 0.4) for v in velocities)


def test_voice_kind_and_hint_preserved(canonical_example):
    out = tonejs.emit(canonical_example)
    voice = out["voices"][0]
    assert voice["name"] == "voice"
    assert voice["kind"] == "pitched"
    assert voice["instrument_hint"] == "soft-vocal-pad"


def test_drum_voice_events_use_instrument_hint(canonical_drum_example):
    """Drum events carry the drum name so the player can pick a synth."""
    out = tonejs.emit(canonical_drum_example)
    kick_voice = next(v for v in out["voices"] if v["name"] == "kick")
    assert kick_voice["kind"] == "drum"
    assert kick_voice["instrument_hint"] == "kick"
    # All kick events have note == 'kick'
    assert all(ev["note"] == "kick" for ev in kick_voice["events"])


def test_drum_step_times_are_evenly_spaced(canonical_drum_example):
    """8 events per bar at 96 BPM -> step = (4 * 60/96) / 8 = 0.3125s."""
    out = tonejs.emit(canonical_drum_example)
    kick = next(v for v in out["voices"] if v["name"] == "kick")
    # kick hits at step 0 and step 4 (boots-cats)
    times = [ev["time"] for ev in kick["events"]]
    spb = 60 / 96
    bar_seconds = 4 * spb
    step_seconds = bar_seconds / 8
    assert math.isclose(times[0], 0.0)
    assert math.isclose(times[1], 4 * step_seconds)


def test_skip_events_advance_time_without_emitting(canonical_drum_example):
    """Skip steps in drums and rest events in pitched voices advance the cursor."""
    out = tonejs.emit(canonical_drum_example)
    kick = next(v for v in out["voices"] if v["name"] == "kick")
    # boots-cats kick has 2 hits in the first bar (the test fixture)
    assert len(kick["events"]) == 2


def test_total_duration_reported(canonical_example):
    """The total_seconds field tells the player when to stop."""
    out = tonejs.emit(canonical_example)
    # one bar at 80 bpm = 4 * 0.75 = 3.0s
    assert math.isclose(out["total_seconds"], 3.0)


def test_drum_event_duration_is_short(canonical_drum_example):
    """Drum hits are short: ~0.1s. Long drum events sound wrong."""
    out = tonejs.emit(canonical_drum_example)
    kick = next(v for v in out["voices"] if v["name"] == "kick")
    assert all(ev["duration"] <= 0.2 for ev in kick["events"])


def test_emit_is_deterministic(canonical_example):
    a = tonejs.emit(canonical_example)
    b = tonejs.emit(canonical_example)
    assert a == b


def test_description_carried_through(canonical_example):
    canonical_example["description"] = "three soft rising notes"
    out = tonejs.emit(canonical_example)
    assert out["description"] == "three soft rising notes"


def test_rest_event_in_pitched_voice():
    """A pitched-voice rest event advances time without emitting a note."""
    data = {
        "tempo": 60,  # 1 beat = 1 second
        "feel": "straight",
        "key": {"root": "C", "mode": "major"},
        "mood": ["gentle"],
        "voices": [
            {
                "name": "v",
                "kind": "pitched",
                "instrument_hint": "x",
                "bars": [[
                    {"t": "note", "pitch": "C4", "beats": 1},
                    {"t": "rest", "beats": 1},
                    {"t": "note", "pitch": "E4", "beats": 1},
                ]],
            }
        ],
    }
    out = tonejs.emit(data)
    times = [ev["time"] for ev in out["voices"][0]["events"]]
    # First note at 0, second note at 2 (after a 1-beat rest)
    assert math.isclose(times[0], 0.0)
    assert math.isclose(times[1], 2.0)
