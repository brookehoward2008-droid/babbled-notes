"""CLI tests.

The CLI is the user-facing entry point. The Build judging criterion for
the Gemma 4 challenge weights 'usability,' so the CLI must be friendly:
sane defaults, predictable filenames, clear errors.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
import wave

from lilt import cli


def _write_fixture(tmp_path, data, name="input.json"):
    path = tmp_path / name
    path.write_text(json.dumps(data), encoding="utf-8")
    return path


def _write_sine_wav(path, *, freq=440.0, seconds=0.5, sample_rate=8000):
    frames = bytearray()
    total = int(seconds * sample_rate)
    for i in range(total):
        sample = int(0.45 * 32767 * math.sin(2 * math.pi * freq * (i / sample_rate)))
        frames.extend(sample.to_bytes(2, "little", signed=True))
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(bytes(frames))


def test_version_flag(capsys):
    code = cli.main(["--version"])
    out = capsys.readouterr().out
    assert code == 0
    assert "lilt" in out.lower()


def test_compile_writes_both_artifacts_by_default(tmp_path, canonical_example, capsys):
    inp = _write_fixture(tmp_path, canonical_example)
    code = cli.main(["compile", str(inp)])
    assert code == 0
    expected_lilt = tmp_path / "input.lilt"
    expected_mid = tmp_path / "input.mid"
    assert expected_lilt.exists()
    assert expected_mid.exists()
    assert expected_mid.read_bytes()[:4] == b"MThd"


def test_compile_to_mid_only(tmp_path, canonical_example):
    inp = _write_fixture(tmp_path, canonical_example)
    out = tmp_path / "out.mid"
    code = cli.main(["compile", str(inp), "-o", str(out)])
    assert code == 0
    assert out.exists()
    assert out.read_bytes()[:4] == b"MThd"
    assert not (tmp_path / "input.lilt").exists()


def test_compile_to_lilt_only(tmp_path, canonical_example):
    inp = _write_fixture(tmp_path, canonical_example)
    out = tmp_path / "out.lilt"
    code = cli.main(["compile", str(inp), "-o", str(out)])
    assert code == 0
    text = out.read_text(encoding="utf-8")
    assert text.startswith("tempo 80")
    assert "\r" not in text
    assert not (tmp_path / "input.mid").exists()


def test_compile_schema_violation_exits_nonzero(tmp_path, canonical_example, capsys):
    canonical_example["mood"] = ["funky"]
    inp = _write_fixture(tmp_path, canonical_example)
    code = cli.main(["compile", str(inp)])
    err = capsys.readouterr().err
    assert code != 0
    assert "schema" in err.lower() or "mood" in err.lower()


def test_compile_missing_file_exits_nonzero(tmp_path, capsys):
    code = cli.main(["compile", str(tmp_path / "does-not-exist.json")])
    assert code != 0
    err = capsys.readouterr().err
    assert err  # something was printed


def test_compile_invalid_json_exits_nonzero(tmp_path, capsys):
    inp = tmp_path / "bad.json"
    inp.write_text("{not really json", encoding="utf-8")
    code = cli.main(["compile", str(inp)])
    assert code != 0
    assert "json" in capsys.readouterr().err.lower()


def test_audio_with_fake_backend_writes_all_artifacts(tmp_path, canonical_example):
    audio = tmp_path / "hum.wav"
    audio.write_bytes(b"fake wav bytes")
    digest = _write_fixture(tmp_path, {"duration_s": 1.0}, "digest.json")
    response = _write_fixture(tmp_path, canonical_example, "response.json")
    out_base = tmp_path / "compiled"

    code = cli.main([
        "audio",
        str(audio),
        "--digest",
        str(digest),
        "--backend",
        "fake",
        "--fake-response",
        str(response),
        "--output-base",
        str(out_base),
    ])

    assert code == 0
    assert (tmp_path / "compiled.json").exists()
    assert (tmp_path / "compiled.lilt").exists()
    assert (tmp_path / "compiled.mid").read_bytes()[:4] == b"MThd"


def test_audio_fake_backend_requires_response(tmp_path, capsys):
    audio = tmp_path / "hum.wav"
    audio.write_bytes(b"fake wav bytes")
    digest = _write_fixture(tmp_path, {"duration_s": 1.0}, "digest.json")

    code = cli.main(["audio", str(audio), "--digest", str(digest), "--backend", "fake"])

    assert code != 0
    assert "fake-response" in capsys.readouterr().err


def test_audio_mime_type_matches_browser_recording_formats():
    assert cli._audio_mime_type(Path("clip.wav")) == "audio/wav"
    assert cli._audio_mime_type(Path("clip.webm")) == "audio/webm"
    assert cli._audio_mime_type(Path("clip.ogg")) == "audio/ogg"
    assert cli._audio_mime_type(Path("clip.m4a")) == "audio/mp4"
    assert cli._audio_mime_type(Path("clip.unknown")) == "application/octet-stream"


def test_seed_writes_json_lilt_and_midi_from_digest(tmp_path):
    digest = _write_fixture(tmp_path, {
        "estimated_bpm": 90,
        "estimated_key": "C major",
        "pitch_trace": ["C4", "E4", "G4"],
        "onsets": [0.0, 0.5, 1.0],
        "quality": {"level": "usable"},
        "features": {"gesture_density": "moderate", "pitch_direction": "rising"},
    }, "digest.json")
    out_base = tmp_path / "seeded"

    code = cli.main(["seed", str(digest), "--output-base", str(out_base)])

    assert code == 0
    assert (tmp_path / "seeded.json").exists()
    assert "voice voice:" in (tmp_path / "seeded.lilt").read_text(encoding="utf-8")
    assert (tmp_path / "seeded.mid").read_bytes()[:4] == b"MThd"


def test_sketch_writes_digest_json_lilt_and_midi_from_wav(tmp_path):
    wav = tmp_path / "idea.wav"
    _write_sine_wav(wav, freq=440.0)
    out_base = tmp_path / "idea-sketch"

    code = cli.main(["sketch", str(wav), "--output-base", str(out_base)])

    assert code == 0
    assert (tmp_path / "idea-sketch.digest.json").exists()
    assert (tmp_path / "idea-sketch.json").exists()
    assert "voice voice:" in (tmp_path / "idea-sketch.lilt").read_text(encoding="utf-8")
    assert (tmp_path / "idea-sketch.mid").read_bytes()[:4] == b"MThd"


def test_tonejs_writes_event_file(tmp_path, canonical_example):
    inp = _write_fixture(tmp_path, canonical_example)
    code = cli.main(["tonejs", str(inp)])
    assert code == 0
    out = tmp_path / "input.tonejs.json"
    assert out.exists()
    payload = json.loads(out.read_text(encoding="utf-8"))
    assert payload["tempo"] == 80
    assert len(payload["voices"]) == 1


def test_tonejs_with_explicit_output(tmp_path, canonical_example):
    inp = _write_fixture(tmp_path, canonical_example)
    out = tmp_path / "play.json"
    code = cli.main(["tonejs", str(inp), "-o", str(out)])
    assert code == 0
    assert out.exists()


def test_voice_dry_run_writes_prompt(tmp_path, canonical_example):
    inp = _write_fixture(tmp_path, canonical_example)
    out = tmp_path / "voice.txt"
    code = cli.main(["voice", str(inp), "--style", "beethoven", "--dry-run-prompt", "-o", str(out)])
    assert code == 0
    text = out.read_text(encoding="utf-8")
    assert "Vocalize this short musical idea" in text
    assert "bold" in text
    assert "la(C4" in text


def test_playback_plan_writes_plan_and_prompt(tmp_path, canonical_example):
    inp = _write_fixture(tmp_path, canonical_example)
    plan_out = tmp_path / "plan.json"
    prompt_out = tmp_path / "plan-prompt.txt"

    code = cli.main(["playback-plan", str(inp), "--style", "chopin", "--space", "room", "-o", str(plan_out)])
    prompt_code = cli.main([
        "playback-plan",
        str(inp),
        "--style",
        "chopin",
        "--space",
        "room",
        "--dry-run-prompt",
        "-o",
        str(prompt_out),
    ])

    assert code == 0
    assert prompt_code == 0
    plan = json.loads(plan_out.read_text(encoding="utf-8"))
    assert plan["style"] == "chopin"
    assert plan["vocal_depth"]
    assert "playback production plan" in prompt_out.read_text(encoding="utf-8")


def test_info_prints_summary(tmp_path, canonical_example, capsys):
    inp = _write_fixture(tmp_path, canonical_example)
    code = cli.main(["info", str(inp)])
    out = capsys.readouterr().out
    assert code == 0
    assert "80" in out  # tempo
    assert "C major" in out
    assert "voice" in out  # at least one voice
