"""Lilt command-line interface.

Subcommands:
  compile  Read a Lilt JSON file (the structured contract) and emit the
           text program and a Standard MIDI File.
  audio    Read an audio file plus DSP digest and run the full model pipeline.
  digest   Read a WAV file and write the DSP digest Gemma receives.
  info     Print a short summary of a Lilt JSON file. Useful for
           sighted and screen-reader users alike.
  demo-data
           Regenerate the static browser demo data from examples.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import jsonschema

from . import __version__, codegen, demo, dsp, midi, pipeline, schema, tonejs, translate, voice
from .backends.fake import FakeBackend
from .backends.gemini import GeminiBackend


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

    p_audio = sub.add_parser("audio", help="Audio + DSP digest -> .json, .lilt, and .mid")
    p_audio.add_argument("audio", help="Path to a short audio file")
    p_audio.add_argument("--digest", required=True, help="Path to a DSP digest JSON file")
    p_audio.add_argument(
        "--backend",
        choices=("gemini", "fake"),
        default="gemini",
        help="Model backend. Use fake with --fake-response for offline demos.",
    )
    p_audio.add_argument(
        "--fake-response",
        help="Lilt JSON response used by --backend fake.",
    )
    p_audio.add_argument(
        "--output-base",
        help="Output path without extension. Defaults to the audio filename stem.",
    )

    p_seed = sub.add_parser("seed", help="DSP digest -> starter .json, .lilt, and .mid")
    p_seed.add_argument("digest", help="Path to a DSP digest JSON file")
    p_seed.add_argument(
        "--output-base",
        help="Output path without extension. Defaults to the digest filename stem.",
    )

    p_digest = sub.add_parser("digest", help="WAV -> DSP digest JSON")
    p_digest.add_argument("input", help="Path to a PCM WAV file")
    p_digest.add_argument(
        "-o", "--output",
        help="Output path. Defaults to <input>.digest.json beside the WAV.",
    )

    p_info = sub.add_parser("info", help="Print a short summary")
    p_info.add_argument("input", help="Path to a Lilt JSON file")

    p_tonejs = sub.add_parser("tonejs", help="JSON -> Tone.js event file for browser playback")
    p_tonejs.add_argument("input", help="Path to a Lilt JSON file")
    p_tonejs.add_argument(
        "-o", "--output",
        help="Output path. Defaults to <input>.tonejs.json alongside the input.",
    )

    p_voice = sub.add_parser("voice", help="JSON -> AI voice render prompt or WAV")
    p_voice.add_argument("input", help="Path to a Lilt JSON file")
    p_voice.add_argument(
        "--style",
        choices=("bach", "beethoven", "mozart", "chopin"),
        default="chopin",
        help="Classical performance style. Defaults to chopin.",
    )
    p_voice.add_argument("--voice", default="Kore", help="Gemini TTS voice name.")
    p_voice.add_argument(
        "--model",
        default="gemini-3.1-flash-tts-preview",
        help="Gemini TTS model.",
    )
    p_voice.add_argument(
        "--dry-run-prompt",
        action="store_true",
        help="Write the TTS prompt without calling Gemini.",
    )
    p_voice.add_argument(
        "-o", "--output",
        help="Output path. Defaults to <input>.voice.wav or <input>.voice-prompt.txt.",
    )

    p_demo = sub.add_parser("demo-data", help="Regenerate docs/data.js from examples")
    p_demo.add_argument(
        "--examples",
        default="examples",
        help="Directory containing example JSON files. Defaults to ./examples.",
    )
    p_demo.add_argument(
        "-o", "--output",
        default="docs/data.js",
        help="Output JavaScript path. Defaults to docs/data.js.",
    )

    args = parser.parse_args(raw)

    if args.cmd == "compile":
        return _cmd_compile(args.input, args.output)
    if args.cmd == "audio":
        return _cmd_audio(
            args.audio,
            args.digest,
            args.backend,
            args.fake_response,
            args.output_base,
        )
    if args.cmd == "seed":
        return _cmd_seed(args.digest, args.output_base)
    if args.cmd == "digest":
        return _cmd_digest(args.input, args.output)
    if args.cmd == "info":
        return _cmd_info(args.input)
    if args.cmd == "tonejs":
        return _cmd_tonejs(args.input, args.output)
    if args.cmd == "voice":
        return _cmd_voice(
            args.input,
            args.output,
            args.style,
            args.voice,
            args.model,
            args.dry_run_prompt,
        )
    if args.cmd == "demo-data":
        return _cmd_demo_data(args.examples, args.output)

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


def _cmd_audio(
    audio_path: str,
    digest_path: str,
    backend_name: str,
    fake_response_path: str | None,
    output_base: str | None,
) -> int:
    digest = _load_json(digest_path)
    if digest is None:
        return 2

    audio_file = Path(audio_path)
    if not audio_file.exists():
        print(f"error: audio file not found: {audio_file}", file=sys.stderr)
        return 2

    response_payload = None
    if backend_name == "fake":
        if not fake_response_path:
            print("error: --backend fake requires --fake-response", file=sys.stderr)
            return 2
        response_payload = _load_json(fake_response_path)
        if response_payload is None:
            return 2

    backend = (
        FakeBackend(default=response_payload)
        if backend_name == "fake"
        else GeminiBackend()
    )

    try:
        result = pipeline.compile_audio(
            audio=audio_file.read_bytes(),
            digest=digest,
            backend=backend,
        )
    except Exception as e:
        print(f"error: audio compile failed: {e}", file=sys.stderr)
        return 5

    base = Path(output_base) if output_base else audio_file.with_suffix("")
    json_path = base.with_suffix(".json")
    lilt_path = base.with_suffix(".lilt")
    mid_path = base.with_suffix(".mid")
    json_path.write_text(
        json.dumps(result.json_data, indent=2, sort_keys=False),
        encoding="utf-8",
        newline="\n",
    )
    lilt_path.write_text(result.lilt_source, encoding="utf-8", newline="\n")
    mid_path.write_bytes(result.midi_bytes)
    print(f"wrote {json_path}")
    print(f"wrote {lilt_path}")
    print(f"wrote {mid_path}")
    return 0


def _cmd_seed(digest_path: str, output_base: str | None) -> int:
    digest = _load_json(digest_path)
    if digest is None:
        return 2
    try:
        data = translate.digest_to_seed(digest)
    except Exception as e:
        print(f"error: could not translate digest: {e}", file=sys.stderr)
        return 5

    base = Path(output_base) if output_base else Path(digest_path).with_suffix("").with_suffix("")
    json_path = base.with_suffix(".json")
    lilt_path = base.with_suffix(".lilt")
    mid_path = base.with_suffix(".mid")
    json_path.write_text(
        json.dumps(data, indent=2, sort_keys=False),
        encoding="utf-8",
        newline="\n",
    )
    lilt_path.write_text(codegen.emit(data), encoding="utf-8", newline="\n")
    mid_path.write_bytes(midi.emit(data))
    print(f"wrote {json_path}")
    print(f"wrote {lilt_path}")
    print(f"wrote {mid_path}")
    return 0


def _cmd_digest(input_path: str, output_path: str | None) -> int:
    path = Path(input_path)
    if not path.exists():
        print(f"error: WAV file not found: {path}", file=sys.stderr)
        return 2
    out = Path(output_path) if output_path else path.with_suffix(".digest.json")
    try:
        payload = dsp.digest_wav(path)
    except Exception as e:
        print(f"error: could not read WAV: {e}", file=sys.stderr)
        return 3
    out.write_text(
        json.dumps(payload, indent=2, sort_keys=False),
        encoding="utf-8",
        newline="\n",
    )
    print(f"wrote {out}")
    return 0


def _cmd_tonejs(input_path: str, output_path: str | None) -> int:
    data = _load_json(input_path)
    if data is None:
        return 2
    try:
        schema.validate(data)
    except jsonschema.ValidationError as e:
        print(f"error: input does not match Lilt schema: {e.message}", file=sys.stderr)
        return 3

    payload = tonejs.emit(data)
    if output_path is None:
        out = Path(input_path).with_suffix("").with_suffix(".tonejs.json")
    else:
        out = Path(output_path)
    out.write_text(
        json.dumps(payload, indent=2, sort_keys=False),
        encoding="utf-8",
        newline="\n",
    )
    print(f"wrote {out}")
    return 0


def _cmd_voice(
    input_path: str,
    output_path: str | None,
    style: str,
    voice_name: str,
    model: str,
    dry_run_prompt: bool,
) -> int:
    data = _load_json(input_path)
    if data is None:
        return 2
    try:
        schema.validate(data)
    except jsonschema.ValidationError as e:
        print(f"error: input does not match Lilt schema: {e.message}", file=sys.stderr)
        return 3

    base = Path(input_path).with_suffix("")
    if dry_run_prompt:
        out = Path(output_path) if output_path else base.with_suffix(".voice-prompt.txt")
        out.write_text(voice.prompt_for_voice(data, style), encoding="utf-8", newline="\n")
        print(f"wrote {out}")
        return 0

    out = Path(output_path) if output_path else base.with_suffix(".voice.wav")
    try:
        voice.render_voice(data, out, style=style, voice_name=voice_name, model=model)
    except Exception as e:
        print(f"error: voice render failed: {e}", file=sys.stderr)
        return 5
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


def _cmd_demo_data(examples_dir: str, output_path: str) -> int:
    examples = Path(examples_dir)
    out = Path(output_path)
    if not examples.exists():
        print(f"error: examples directory not found: {examples}", file=sys.stderr)
        return 2
    try:
        demo.write_js(examples, out)
    except (OSError, json.JSONDecodeError, jsonschema.ValidationError) as e:
        print(f"error: could not generate demo data: {e}", file=sys.stderr)
        return 3
    print(f"wrote {out}")
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
