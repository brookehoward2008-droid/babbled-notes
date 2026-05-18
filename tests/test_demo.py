"""Static browser demo generation tests."""

from __future__ import annotations

import json
from pathlib import Path

from lilt import cli, demo


def test_build_demo_data_uses_compiler_outputs():
    demos = demo.build_demo_data(Path("examples"))
    first = demos[0]
    assert first["id"] == "three-note-hum"
    assert first["title"] == "Three-note hum"
    assert first["lilt_source"].startswith("# a slow, three-note ascending hum")
    assert first["payload"]["tempo"] == 80
    assert first["payload"]["voices"][0]["events"][0]["note"] == "C4"


def test_emit_js_is_parseable_after_assignment_prefix():
    js = demo.emit_js([{
        "id": "x",
        "title": "X",
        "lilt_source": "tempo 80\n",
        "payload": {"tempo": 80},
    }])
    assert js.startswith("/**")
    payload = js.split("window.LILT_DEMOS = ", 1)[1].removesuffix(";\n")
    assert json.loads(payload)[0]["id"] == "x"


def test_demo_data_cli_writes_js(tmp_path):
    out = tmp_path / "data.js"
    code = cli.main(["demo-data", "--examples", "examples", "-o", str(out)])
    assert code == 0
    text = out.read_text(encoding="utf-8")
    assert "window.LILT_DEMOS" in text
    assert "three-note-hum" in text
