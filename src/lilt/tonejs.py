"""Tone.js event emitter for in-browser playback.

INTEGRATIONS.MD names this as the second compile target alongside MIDI:
'Tone.js JSON (a list of {time, note, duration, velocity, voice} events)
for in-browser playback.'

Output is a dict, grouped by voice so the player can give each voice its
own synth. Times are absolute seconds from start. Velocities are 0..1.
"""

from __future__ import annotations

from . import schema

_VELOCITY = {"soft": 0.4, "mf": 0.65, "loud": 0.9}
_DEFAULT_VELOCITY = 0.65
_DRUM_DURATION_SECONDS = 0.1
BEATS_PER_BAR = 4


def emit(data: dict) -> dict:
    """Lilt JSON dict -> Tone.js event dict."""
    schema.validate(data)
    spb = 60.0 / int(data["tempo"])
    bar_seconds = BEATS_PER_BAR * spb

    voices_out = []
    max_end = 0.0
    for voice in data["voices"]:
        events, voice_end = (
            _drum_voice_events(voice, bar_seconds)
            if voice["kind"] == "drum"
            else _pitched_voice_events(voice, spb, bar_seconds)
        )
        voices_out.append({
            "name": voice["name"],
            "kind": voice["kind"],
            "instrument_hint": voice["instrument_hint"],
            "events": events,
        })
        max_end = max(max_end, voice_end)

    out = {
        "tempo": int(data["tempo"]),
        "feel": data["feel"],
        "key": data["key"],
        "mood": list(data["mood"]),
        "total_seconds": round(max_end, 6),
        "voices": voices_out,
    }
    if "description" in data:
        out["description"] = data["description"]
    return out


def _pitched_voice_events(voice: dict, spb: float, bar_seconds: float):
    events: list[dict] = []
    cursor = 0.0  # absolute seconds from start
    for bar in voice["bars"]:
        bar_start = cursor
        bar_cursor = 0.0  # seconds into this bar
        for ev in bar:
            t = ev["t"]
            beats = float(ev.get("beats", 1))
            event_seconds = beats * spb
            if t == "rest" or t == "skip":
                bar_cursor += event_seconds
                continue
            if t != "note":
                continue
            duration = event_seconds
            if ev.get("hold"):
                duration = max(duration, bar_seconds - bar_cursor)
            velocity = _VELOCITY.get(ev.get("dynamic", ""), _DEFAULT_VELOCITY)
            events.append({
                "time": round(bar_start + bar_cursor, 6),
                "note": ev["pitch"],
                "duration": round(duration, 6),
                "velocity": velocity,
            })
            bar_cursor += event_seconds
        cursor = bar_start + bar_seconds
    return events, cursor


def _drum_voice_events(voice: dict, bar_seconds: float):
    events: list[dict] = []
    cursor = 0.0
    drum_name = voice["instrument_hint"].lower()
    for bar in voice["bars"]:
        steps = len(bar) or 1
        step_seconds = bar_seconds / steps
        bar_start = cursor
        for i, ev in enumerate(bar):
            step_time = bar_start + i * step_seconds
            if ev["t"] == "hit":
                velocity = _VELOCITY.get(ev.get("dynamic", ""), _DEFAULT_VELOCITY)
                if ev.get("articulation") == "ghost":
                    velocity = min(velocity, 0.3)
                events.append({
                    "time": round(step_time, 6),
                    "note": drum_name,
                    "duration": _DRUM_DURATION_SECONDS,
                    "velocity": velocity,
                })
        cursor = bar_start + bar_seconds
    return events, cursor
