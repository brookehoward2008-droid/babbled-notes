"""Deterministic JSON-to-Lilt-source codegen.

Honors the determinism contract in GRAMMAR.md:
- UTF-8, LF newlines.
- Same input dict -> byte-identical output text.
- No timestamps, no run-dependent IDs, no auto-comments.
- Stable voice ordering (preserved from input).
- Two spaces of indent inside voice blocks. Single spaces between tokens.
- Exactly one trailing newline.
"""

from __future__ import annotations

from . import schema


def emit(data: dict) -> str:
    """JSON dict (already schema-valid) -> Lilt source text.

    Caller is responsible for validating; we assert as a tripwire.
    """
    schema.validate(data)

    lines: list[str] = []
    if "description" in data:
        collapsed = " ".join(data["description"].split())
        lines.append(f"# {collapsed}")
        lines.append("")
    lines.append(f"tempo {data['tempo']}")
    lines.append(f"feel {data['feel']}")
    lines.append(f"key {data['key']['root']} {data['key']['mode']}")
    lines.append("key-mood-spacer")  # placeholder, replaced below; keeps ordering deterministic
    lines.append(f"mood {', '.join(data['mood'])}")

    for voice in data["voices"]:
        lines.append("")
        lines.extend(_emit_voice(voice))

    # Replace the placeholder spacer line with a blank line. Two-pass keeps
    # ordering obvious instead of relying on ad-hoc indices.
    out = "\n".join("" if line == "key-mood-spacer" else line for line in lines)
    return out + "\n"


def _emit_voice(voice: dict) -> list[str]:
    header = f"voice {voice['name']}:"
    if voice["kind"] == "drum":
        # All bars rendered as one-line drum patterns. Per GRAMMAR.md a drum bar
        # is a sequence of step characters separated by single spaces.
        bar_lines = []
        for bar in voice["bars"]:
            bar_lines.append("  " + " ".join(_drum_step(ev) for ev in bar))
        return [header, *bar_lines]

    # Pitched voice: each bar is a line; events space-separated.
    bar_lines = []
    for bar in voice["bars"]:
        bar_lines.append("  " + _emit_pitched_bar(bar))
    return [header, *bar_lines]


def _drum_step(event: dict) -> str:
    t = event["t"]
    if t == "hit":
        # Articulation maps to a louder/softer hit visually:
        if event.get("dynamic") == "soft" or event.get("articulation") == "ghost":
            return "o"
        return "x"
    if t == "skip":
        return "."
    if t == "rest":
        return "."
    raise ValueError(f"unsupported drum event type: {t}")


def _emit_pitched_bar(events: list[dict]) -> str:
    pieces: list[str] = []
    for ev in events:
        t = ev["t"]
        if t == "rest":
            beats = ev.get("beats", 1)
            # Whole-number beats render as `rest N`; fractional as `rest 0.5` etc.
            beats_str = _format_beats(beats)
            pieces.append(f"rest {beats_str}")
            continue
        if t == "skip":
            pieces.append(".")
            continue
        if t != "note":
            raise ValueError(f"unsupported pitched event type: {t}")
        token = ev["pitch"]
        if "glide_to" in ev:
            token = f"{token} ~ {ev['glide_to']}"
        if ev.get("tied"):
            token = f"{token} _"
        if ev.get("hold"):
            token = f"{token} hold"
        if "articulation" in ev:
            token = f"{token} / {ev['articulation']}"
        if "dynamic" in ev:
            token = f"{token} ! {ev['dynamic']}"
        pieces.append(token)
    return " ".join(pieces)


def _format_beats(beats: float) -> str:
    """Render beats so 1.0 -> '1' and 0.5 -> '0.5'. Stable, no locale."""
    if float(beats).is_integer():
        return str(int(beats))
    # Strip trailing zeros without using %g (locale-sensitive).
    s = f"{beats:.4f}".rstrip("0").rstrip(".")
    return s
