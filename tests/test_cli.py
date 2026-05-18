"""CLI tests.

The CLI is the user-facing entry point. The Build judging criterion for
the Gemma 4 challenge weights 'usability,' so the CLI must be friendly:
sane defaults, predictable filenames, clear errors.
"""

from __future__ import annotations

import json

import pytest

from lilt import cli


def _write_fixture(tmp_path, data, name="input.json"):
    path = tmp_path / name
    path.write_text(json.dumps(data), encoding="utf-8")
    return path


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


def test_info_prints_summary(tmp_path, canonical_example, capsys):
    inp = _write_fixture(tmp_path, canonical_example)
    code = cli.main(["info", str(inp)])
    out = capsys.readouterr().out
    assert code == 0
    assert "80" in out  # tempo
    assert "C major" in out
    assert "voice" in out  # at least one voice
