"""Deterministic digest-to-Lilt JSON seed translator."""

from __future__ import annotations

from . import schema


def digest_to_seed(digest: dict) -> dict:
    """Create schema-valid starter music JSON from a DSP digest."""
    pitches = [note for note in digest.get("pitch_trace", []) if isinstance(note, str)]
    onsets = [value for value in digest.get("onsets", []) if isinstance(value, int | float)]
    tempo = _tempo(digest)
    key = _key(digest)
    quality_level = (digest.get("quality") or {}).get("level", "usable")
    features = digest.get("features") or {}
    density = features.get("gesture_density", "sparse")

    data = {
        "tempo": tempo,
        "feel": _feel(density),
        "key": key,
        "mood": _mood(quality_level, density, features.get("pitch_direction", "steady")),
        "description": _description(pitches, onsets, quality_level),
        "voices": [],
    }

    if pitches:
        data["voices"].append(_pitched_voice(pitches, onsets, quality_level))
    else:
        data["voices"].append(_drum_voice(onsets, quality_level))

    schema.validate(data)
    return data


def _tempo(digest: dict) -> int:
    value = digest.get("estimated_bpm") or 80
    try:
        tempo = int(round(float(value)))
    except (TypeError, ValueError):
        tempo = 80
    return max(30, min(300, tempo))


def _key(digest: dict) -> dict:
    raw = str(digest.get("estimated_key") or "C major")
    parts = raw.split()
    root = parts[0] if parts else "C"
    mode = parts[1] if len(parts) > 1 else "major"
    if root not in schema.ROOTS:
        root = "C"
    if mode not in schema.MODES:
        mode = "major"
    return {"root": root, "mode": mode}


def _feel(density: str) -> str:
    if density == "dense":
        return "tight"
    if density == "moderate":
        return "straight"
    return "loose"


def _mood(quality_level: str, density: str, direction: str) -> list[str]:
    mood = []
    if quality_level == "too_quiet":
        mood.extend(["gentle", "intimate"])
    elif quality_level == "clipped":
        mood.extend(["urgent", "dense"])
    elif density == "dense":
        mood.extend(["bright", "tight"])
    else:
        mood.extend(["warm", "sparse"])

    if direction == "rising" and "bright" not in mood:
        mood.append("bright")
    elif direction == "falling" and "pensive" not in mood:
        mood.append("pensive")
    return mood[:3]


def _description(pitches: list[str], onsets: list[float], quality_level: str) -> str:
    if pitches:
        return f"a {quality_level.replace('_', ' ')} vocal idea with {len(pitches)} traced pitches"
    return f"a {quality_level.replace('_', ' ')} rhythmic idea with {len(onsets)} onsets"


def _pitched_voice(pitches: list[str], onsets: list[float], quality_level: str) -> dict:
    dynamic = _dynamic(quality_level)
    beats = _beats_from_onsets(onsets, fallback=1.0)
    events = []
    for index, pitch in enumerate(pitches[:16]):
        event = {
            "t": "note",
            "pitch": pitch,
            "beats": beats[index] if index < len(beats) else beats[-1],
            "dynamic": dynamic,
        }
        if event["beats"] >= 1.5:
            event["hold"] = True
            event["articulation"] = "legato"
        elif event["beats"] <= 0.5:
            event["articulation"] = "staccato"
        events.append(event)
    return {
        "name": "voice",
        "kind": "pitched",
        "instrument_hint": "warm voice",
        "bars": [_fit_bar(events)],
    }


def _drum_voice(onsets: list[float], quality_level: str) -> dict:
    dynamic = _dynamic(quality_level)
    count = max(1, min(16, len(onsets) or 4))
    beats = _beats_from_onsets(onsets, fallback=0.5)
    events = []
    for index in range(count):
        event = {
            "t": "hit",
            "beats": beats[index] if index < len(beats) else beats[-1],
            "dynamic": dynamic,
        }
        if dynamic == "soft":
            event["articulation"] = "ghost"
        elif event["beats"] <= 0.5:
            event["articulation"] = "staccato"
        events.append(event)
    return {
        "name": "pulse",
        "kind": "drum",
        "instrument_hint": "body percussion",
        "bars": [_fit_bar(events)],
    }


def _beats_from_onsets(onsets: list[float], *, fallback: float) -> list[float]:
    if len(onsets) < 2:
        return [fallback]
    beats = []
    for current, next_onset in zip(onsets, onsets[1:]):
        delta = max(0.125, min(4.0, next_onset - current))
        beats.append(round(_nearest_beat(delta * 2), 3))
    beats.append(beats[-1])
    return beats


def _nearest_beat(value: float) -> float:
    choices = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]
    return min(choices, key=lambda item: abs(item - value))


def _fit_bar(events: list[dict]) -> list[dict]:
    total = 0.0
    fitted = []
    for event in events:
        beats = float(event.get("beats", 1))
        if total + beats > 4 and fitted:
            break
        fitted.append(event)
        total += beats
    if total < 4:
        fitted.append({"t": "rest", "beats": round(4 - total, 3)})
    return fitted


def _dynamic(quality_level: str) -> str:
    if quality_level == "too_quiet":
        return "soft"
    if quality_level in {"clipped", "very_loud"}:
        return "loud"
    return "mf"
