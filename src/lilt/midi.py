"""Deterministic JSON-to-MIDI emitter.

Honors the determinism contract: same JSON dict in -> byte-identical .mid bytes
out. One MIDI track per voice (SMF type 1). Pitched voices on channel 0; drum
voices on channel 9 (General MIDI channel 10, zero-indexed).
"""

from __future__ import annotations

import io
from pathlib import Path

import mido

from . import schema

TICKS_PER_BEAT = 480
BEATS_PER_BAR = 4
BAR_TICKS = TICKS_PER_BEAT * BEATS_PER_BAR

_VELOCITY = {"soft": 50, "mf": 80, "loud": 110}
_DEFAULT_VELOCITY = 80
_DRUM_DECAY_TICKS = 60  # short note-off for drum hits

_NOTE_OFFSETS = {
    "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5,
    "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11,
}

_DRUM_MAP = {
    "kick": 36, "bass-drum": 36, "bd": 36,
    "snare": 38, "sd": 38,
    "side-stick": 37, "rim": 37,
    "closed-hat": 42, "hat": 42, "closed-hi-hat": 42, "ch": 42,
    "open-hat": 46, "open-hi-hat": 46, "oh": 46,
    "pedal-hat": 44,
    "low-tom": 41, "mid-tom": 47, "high-tom": 50, "tom": 47,
    "crash": 49, "ride": 51,
    "clap": 39, "cowbell": 56, "tambourine": 54,
}
_DEFAULT_DRUM_NOTE = 38  # snare


def emit(data: dict) -> bytes:
    """JSON dict (already schema-valid) -> SMF type-1 MIDI bytes."""
    schema.validate(data)

    mf = mido.MidiFile(type=1, ticks_per_beat=TICKS_PER_BEAT)
    tempo_us = 60_000_000 // int(data["tempo"])

    for idx, voice in enumerate(data["voices"]):
        track = mido.MidiTrack()
        track.append(mido.MetaMessage("track_name", name=voice["name"], time=0))
        if idx == 0:
            track.append(mido.MetaMessage("set_tempo", tempo=tempo_us, time=0))
        if voice["kind"] == "drum":
            _fill_drum_track(track, voice)
        else:
            _fill_pitched_track(track, voice)
        track.append(mido.MetaMessage("end_of_track", time=0))
        mf.tracks.append(track)

    buf = io.BytesIO()
    mf.save(file=buf)
    return buf.getvalue()


def write(data: dict, path: str | Path) -> None:
    Path(path).write_bytes(emit(data))


def _fill_pitched_track(track: mido.MidiTrack, voice: dict) -> None:
    """Emit a pitched voice. Channel 0. Notes are sequential within a bar."""
    pending_delta = 0  # ticks since the last emitted event
    for bar in voice["bars"]:
        cursor = 0  # ticks into this bar
        for ev in bar:
            t = ev["t"]
            beats = float(ev.get("beats", 1))
            event_ticks = int(round(beats * TICKS_PER_BEAT))
            if t == "rest" or t == "skip":
                cursor += event_ticks
                pending_delta += event_ticks
                continue
            if t != "note":
                continue
            duration = event_ticks
            if ev.get("hold"):
                duration = max(duration, BAR_TICKS - cursor)
            pitch = _pitch_to_midi(ev["pitch"])
            velocity = _VELOCITY.get(ev.get("dynamic", ""), _DEFAULT_VELOCITY)
            track.append(mido.Message("note_on", note=pitch, velocity=velocity,
                                      channel=0, time=pending_delta))
            track.append(mido.Message("note_off", note=pitch, velocity=0,
                                      channel=0, time=duration))
            cursor += event_ticks
            pending_delta = 0
        # Pad to bar boundary if the events under-fill the bar.
        if cursor < BAR_TICKS:
            pending_delta += BAR_TICKS - cursor


def _fill_drum_track(track: mido.MidiTrack, voice: dict) -> None:
    """Emit a drum voice on channel 9. Step duration = bar / events_in_bar."""
    drum_note = _DRUM_MAP.get(voice["instrument_hint"].lower(), _DEFAULT_DRUM_NOTE)
    pending_delta = 0
    for bar in voice["bars"]:
        steps = len(bar) or 1
        step_ticks = BAR_TICKS // steps
        for ev in bar:
            t = ev["t"]
            if t == "hit":
                velocity = _VELOCITY.get(ev.get("dynamic", ""), _DEFAULT_VELOCITY)
                if ev.get("articulation") == "ghost":
                    velocity = min(velocity, 40)
                track.append(mido.Message("note_on", note=drum_note, velocity=velocity,
                                          channel=9, time=pending_delta))
                track.append(mido.Message("note_off", note=drum_note, velocity=0,
                                          channel=9, time=_DRUM_DECAY_TICKS))
                # Remaining time before the next step starts.
                pending_delta = max(0, step_ticks - _DRUM_DECAY_TICKS)
            else:
                pending_delta += step_ticks


def _pitch_to_midi(pitch: str) -> int:
    """'C4' -> 60, 'F#3' -> 54, 'Bb5' -> 82. C4 is MIDI 60 by convention."""
    if len(pitch) < 2:
        raise ValueError(f"bad pitch: {pitch!r}")
    if pitch[1] in "#b":
        name, octave = pitch[:2], int(pitch[2:])
    else:
        name, octave = pitch[:1], int(pitch[1:])
    offset = _NOTE_OFFSETS[name]
    return (octave + 1) * 12 + offset
