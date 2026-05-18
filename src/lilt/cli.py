"""Lilt command-line interface.

Subcommands:
  compile  Read a Lilt JSON file (the structured contract) and emit the
           text program and a Standard MIDI File.
  info     Print a short summary of a Lilt JSON file. Useful for
           sighted and screen-reader users alike.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import jsonschema

from . import __version__, codegen, midi, schema


def main(argv: list[str] | None = None) -> int:
    raw = list(sys.argv[1:] if argv is None else argv)
    if raw and raw[0] in ("--version", "-V"):
        print(f"lilt {__version__}")
        return 0

    parser = argparse.ArgumentParser(
        prog="lilt",
        description="A tiny programming language whose front-end is your voice.",
    )
    sub = parser.add_subparsers(dest="cmd")

    p_compile = sub.add_parser("compile", help="JSON -> .lilt and/or .mid")
    p_compile.add_argument("input", help="Path to a Lilt JSON file")
    p_compile.add_argument(
        "-o", "--output",
        help="Output path. Format inferred from extension (.lilt or .mid). "
             "If omitted, writes both <input>.lilt and <input>.mid alongside the input.",
    )

    p_info = sub.add_parser("info", help="Print a short summary")
    p_info.add_argument("input", help="Path to a Lilt JSON file")

    args = parser.parse_args(raw)

    if args.cmd == "compile":
        return _cmd_compile(args.input, args.output)
    if args.cmd == "info":
        return _cmd_info(args.input)

    parser.print_help()
    return 0


def _cmd_compile(input_path: str, output_path: str | None) -> int:
    data = _load_json(input_path)
    if data is None:
        return 2

    try:
        schema.validate(data)
    except jsonschema.ValidationError as e:
        print(f"error: input does not match Lilt schema: {e.message}", file=sys.stderr)
        return 3

    if output_path is None:
        base = Path(input_path).with_suffix("")
        lilt_path = base.with_suffix(".lilt")
        mid_path = base.with_suffix(".mid")
        lilt_path.write_text(codegen.emit(data), encoding="utf-8", newline="\n")
        mid_path.write_bytes(midi.emit(data))
        print(f"wrote {lilt_path}")
        print(f"wrote {mid_path}")
        return 0

    out = Path(output_path)
    ext = out.suffix.lower()
    if ext == ".lilt":
        out.write_text(codegen.emit(data), encoding="utf-8", newline="\n")
    elif ext == ".mid" or ext == ".midi":
        out.write_bytes(midi.emit(data))
    else:
        print(f"error: cannot infer format from extension {ext!r}; "
              "use .lilt or .mid", file=sys.stderr)
        return 4
    print(f"wrote {out}")
    return 0


def _cmd_info(input_path: str) -> int:
    data = _load_json(input_path)
    if data is None:
        return 2

    try:
        schema.validate(data)
    except jsonschema.ValidationError as e:
        print(f"warning: input does not match Lilt schema: {e.message}", file=sys.stderr)

    tempo = data.get("tempo", "?")
    key = data.get("key", {})
    key_str = f"{key.get('root', '?')} {key.get('mode', '?')}"
    feel = data.get("feel", "?")
    mood = ", ".join(data.get("mood", []))
    voices = data.get("voices", [])

    print(f"tempo:   {tempo} bpm")
    print(f"key:     {key_str}")
    print(f"feel:    {feel}")
    print(f"mood:    {mood}")
    print(f"voices:  {len(voices)}")
    for v in voices:
        bar_count = len(v.get("bars", []))
        print(f"  - {v.get('name', '?')} ({v.get('kind', '?')}, "
              f"hint={v.get('instrument_hint', '?')}, bars={bar_count})")
    if "description" in data:
        print(f"description: {data['description']}")
    return 0


def _load_json(path_str: str) -> dict | None:
    path = Path(path_str)
    if not path.exists():
        print(f"error: file not found: {path}", file=sys.stderr)
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"error: not valid JSON: {e.msg} at line {e.lineno}", file=sys.stderr)
        return None


if __name__ == "__main__":
    raise SystemExit(main())
