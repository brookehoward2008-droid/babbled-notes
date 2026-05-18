"""MIDI emitter contract tests.

The emitter is deterministic: same JSON in -> byte-identical .mid out.
One track per voice, drums on channel 9 (GM channel 10), tempo set
from the `tempo` field.
"""

from __future__ import annotations

import io

import mido
import pytest

from lilt import midi


def test_emit_returns_bytes(canonical_example):
    out = midi.emit(canonical_example)
    assert isinstance(out, bytes)
    assert out[:4] == b"MThd"  # MIDI file header magic


def test_emit_is_deterministic(canonical_example):
    a = midi.emit(canonical_example)
    b = midi.emit(canonical_example)
    assert a == b


def test_emit_parseable_by_mido(canonical_example):
    out = midi.emit(canonical_example)
    mf = mido.MidiFile(file=io.BytesIO(out))
    assert mf.type == 1


def test_one_track_per_voice(canonical_example, canonical_drum_example):
    one = mido.MidiFile(file=io.BytesIO(midi.emit(canonical_example)))
    assert len(one.tracks) == 1

    two = mido.MidiFile(file=io.BytesIO(midi.emit(canonical_drum_example)))
    assert len(two.tracks) == 2


def test_tempo_meta_event_set(canonical_example):
    mf = mido.MidiFile(file=io.BytesIO(midi.emit(canonical_example)))
    tempo_events = [m for t in mf.tracks for m in t if m.type == "set_tempo"]
    assert len(tempo_events) >= 1
    # 80 BPM -> 60_000_000 / 80 = 750_000 microseconds per beat
    assert tempo_events[0].tempo == 750_000


def test_track_name_meta_event_per_voice(canonical_drum_example):
    mf = mido.MidiFile(file=io.BytesIO(midi.emit(canonical_drum_example)))
    names = []
    for track in mf.tracks:
        for msg in track:
            if msg.type == "track_name":
                names.append(msg.name)
                break
    assert names == ["kick", "snare"]


def test_pitched_notes_have_correct_pitch_numbers(canonical_example):
    """C4 = 60, E4 = 64, G4 = 67 in MIDI."""
    mf = mido.MidiFile(file=io.BytesIO(midi.emit(canonical_example)))
    note_ons = [m for t in mf.tracks for m in t if m.type == "note_on" and m.velocity > 0]
    assert [m.note for m in note_ons] == [60, 64, 67]


def test_pitched_notes_have_correct_velocities(canonical_example):
    """All three notes are dynamic=soft -> velocity 50."""
    mf = mido.MidiFile(file=io.BytesIO(midi.emit(canonical_example)))
    note_ons = [m for t in mf.tracks for m in t if m.type == "note_on" and m.velocity > 0]
    assert all(m.velocity == 50 for m in note_ons)


def test_pitched_voice_on_channel_0(canonical_example):
    mf = mido.MidiFile(file=io.BytesIO(midi.emit(canonical_example)))
    note_ons = [m for t in mf.tracks for m in t if m.type == "note_on" and m.velocity > 0]
    assert all(m.channel == 0 for m in note_ons)


def test_drum_voice_on_channel_9(canonical_drum_example):
    """GM drums live on channel 9 (zero-indexed; channel 10 in 1-indexed terms)."""
    mf = mido.MidiFile(file=io.BytesIO(midi.emit(canonical_drum_example)))
    note_ons = [m for t in mf.tracks for m in t if m.type == "note_on" and m.velocity > 0]
    assert all(m.channel == 9 for m in note_ons)


def test_drum_instrument_hint_maps_to_gm_note(canonical_drum_example):
    """kick -> 36, snare -> 38 in the General MIDI drum map."""
    mf = mido.MidiFile(file=io.BytesIO(midi.emit(canonical_drum_example)))
    track_notes = {}
    for track in mf.tracks:
        name = None
        notes: list[int] = []
        for msg in track:
            if msg.type == "track_name":
                name = msg.name
            if msg.type == "note_on" and msg.velocity > 0:
                notes.append(msg.note)
        if name:
            track_notes[name] = notes
    assert set(track_notes["kick"]) == {36}
    assert set(track_notes["snare"]) == {38}


def test_hold_extends_note_duration(canonical_example):
    """The third note has hold=True, so it lasts to bar end."""
    mf = mido.MidiFile(file=io.BytesIO(midi.emit(canonical_example)))
    # Walk the only track gathering (note, on_tick, off_tick).
    track = mf.tracks[0]
    abs_time = 0
    on_at: dict[int, int] = {}
    durations: dict[int, int] = {}
    for msg in track:
        abs_time += msg.time
        if msg.type == "note_on" and msg.velocity > 0:
            on_at[msg.note] = abs_time
        elif msg.type == "note_off" or (msg.type == "note_on" and msg.velocity == 0):
            if msg.note in on_at:
                durations[msg.note] = abs_time - on_at[msg.note]
    # G4 is held -> its duration is at least as long as C4 or E4
    assert durations[67] >= durations[60]
    assert durations[67] >= durations[64]


def test_write_midi_creates_file(canonical_example, tmp_path):
    out_path = tmp_path / "out.mid"
    midi.write(canonical_example, out_path)
    assert out_path.exists()
    assert out_path.read_bytes()[:4] == b"MThd"


def test_invalid_input_rejected():
    with pytest.raises(Exception):
        midi.emit({"tempo": "fast"})  # missing required fields + wrong type
