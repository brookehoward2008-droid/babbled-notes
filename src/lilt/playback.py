"""Playback production planning for deeper digital rendering."""

from __future__ import annotations

import json

STYLES = {"bach", "beethoven", "mozart", "chopin"}
SPACES = {"center", "room", "concert-hall"}
VELOCITY_CURVES = {"gentle", "balanced", "expressive", "dramatic"}


def plan_from_lilt(data: dict, *, style: str = "chopin", space: str = "room") -> dict:
    """Create a deterministic playback production plan from Lilt JSON."""
    normalized_style = style if style in STYLES else "chopin"
    normalized_space = space if space in SPACES else "room"
    voices = data.get("voices", [])
    note_count = _count_events(voices, "note")
    hit_count = _count_events(voices, "hit")
    mood = data.get("mood", [])
    density = min(1.0, (note_count + hit_count) / 24)

    plan = {
        "version": 1,
        "style": normalized_style,
        "space": normalized_space,
        "instrument_layers": _instrument_layers(normalized_style, voices),
        "depth": round(_space_depth(normalized_space) + density * 0.18, 3),
        "spatial_width": round(_space_width(normalized_space), 3),
        "humanize_ms": _humanize(normalized_style, density),
        "velocity_curve": _velocity_curve(normalized_style, mood),
        "reverb": _reverb(normalized_space),
        "vocal_depth": {
            "presence": "warm-forward" if "intimate" in mood else "soft-blend",
            "breath_air": 0.18 if "gentle" in mood else 0.1,
            "formant_motion": "subtle",
        },
        "variation": {
            "repeat_mode": "evolve",
            "every_loops": 4,
            "rule": _variation_rule(normalized_style),
        },
        "neural_bloom": {
            "low_band": "base glow",
            "mid_band": "pathway growth",
            "high_band": "upper sparks",
            "spatial": "left-right widening",
        },
    }
    validate_plan(plan)
    return plan


def prompt_for_plan(data: dict, *, style: str = "chopin", space: str = "room") -> str:
    """Prompt Gemma to create a schema-shaped playback production plan."""
    payload = json.dumps(data, indent=2, sort_keys=False)
    return (
        "Create one JSON playback production plan for Babbled Notes digital playback.\n"
        f"Requested style: {style}\n"
        f"Requested space: {space}\n"
        "Focus on depth, quality, vocal depth, spatial width, reverb, humanization, "
        "velocity shaping, repeat variation, and Neural Bloom visual response.\n"
        "Do not make medical claims. Do not generate audio bytes. Do not add API keys.\n"
        "Return only JSON with keys: version, style, space, instrument_layers, depth, "
        "spatial_width, humanize_ms, velocity_curve, reverb, vocal_depth, variation, neural_bloom.\n\n"
        f"Lilt JSON:\n{payload}\n"
    )


def validate_plan(plan: dict) -> None:
    """Raise ValueError if a playback plan is malformed."""
    required = {
        "version", "style", "space", "instrument_layers", "depth", "spatial_width",
        "humanize_ms", "velocity_curve", "reverb", "vocal_depth", "variation", "neural_bloom",
    }
    missing = required - set(plan)
    if missing:
        raise ValueError(f"missing playback plan keys: {sorted(missing)}")
    if plan["style"] not in STYLES:
        raise ValueError(f"unsupported style: {plan['style']}")
    if plan["space"] not in SPACES:
        raise ValueError(f"unsupported space: {plan['space']}")
    if plan["velocity_curve"] not in VELOCITY_CURVES:
        raise ValueError(f"unsupported velocity curve: {plan['velocity_curve']}")
    if not isinstance(plan["instrument_layers"], list) or not plan["instrument_layers"]:
        raise ValueError("instrument_layers must be a non-empty list")
    for key in ("depth", "spatial_width"):
        if not 0 <= float(plan[key]) <= 1:
            raise ValueError(f"{key} must be 0..1")


def _count_events(voices: list[dict], event_type: str) -> int:
    total = 0
    for voice in voices:
        for bar in voice.get("bars", []):
            total += sum(1 for event in bar if event.get("t") == event_type)
    return total


def _instrument_layers(style: str, voices: list[dict]) -> list[dict]:
    base = {
        "bach": ["clean clavichord", "warm chamber strings"],
        "beethoven": ["felt piano", "low cello support"],
        "mozart": ["light piano", "soft clarinet pad"],
        "chopin": ["felt piano", "soft voice pad"],
    }[style]
    has_drums = any(voice.get("kind") == "drum" for voice in voices)
    layers = [{"name": name, "role": "music", "gain": round(0.78 - index * 0.12, 2)}
              for index, name in enumerate(base)]
    if has_drums:
        layers.append({"name": "body percussion", "role": "pulse", "gain": 0.48})
    return layers


def _space_depth(space: str) -> float:
    return {"center": 0.35, "room": 0.58, "concert-hall": 0.76}[space]


def _space_width(space: str) -> float:
    return {"center": 0.18, "room": 0.54, "concert-hall": 0.86}[space]


def _humanize(style: str, density: float) -> int:
    base = {"bach": 8, "mozart": 12, "beethoven": 18, "chopin": 24}[style]
    return int(round(base + density * 10))


def _velocity_curve(style: str, mood: list[str]) -> str:
    if style == "beethoven":
        return "dramatic"
    if style == "chopin":
        return "expressive"
    if "gentle" in mood or "intimate" in mood:
        return "gentle"
    return "balanced"


def _reverb(space: str) -> dict:
    return {
        "center": {"type": "short", "mix": 0.12, "decay_s": 0.8},
        "room": {"type": "warm-room", "mix": 0.28, "decay_s": 1.6},
        "concert-hall": {"type": "wide-hall", "mix": 0.42, "decay_s": 3.2},
    }[space]


def _variation_rule(style: str) -> str:
    return {
        "bach": "answer with a small counter-line while preserving pulse",
        "mozart": "repeat with lighter ornament and clearer cadence",
        "beethoven": "repeat with stronger bass emphasis and wider dynamics",
        "chopin": "repeat with softer rubato and a small melodic sigh",
    }[style]
