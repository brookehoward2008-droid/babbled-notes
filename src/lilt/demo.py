"""Browser demo data generation.

The docs demo is intentionally static, but its data should still come from the
same compiler paths as the CLI. This module turns example JSON files into the
`window.LILT_DEMOS` JavaScript payload used by `docs/player.js`.
"""

from __future__ import annotations

import json
from pathlib import Path

from . import codegen, schema, tonejs

DEFAULT_ORDER = (
    "three_note_hum.json",
    "mary_had_a_little_lamb.json",
    "boots_cats.json",
)


def build_demo_data(examples_dir: Path, order: tuple[str, ...] = DEFAULT_ORDER) -> list[dict]:
    """Return browser demo entries generated from example JSON files."""
    demos = []
    for filename in order:
        path = examples_dir / filename
        data = json.loads(path.read_text(encoding="utf-8"))
        schema.validate(data)
        slug = path.stem.replace("_", "-")
        demos.append({
            "id": slug,
            "title": _title_from_slug(slug),
            "lilt_source": codegen.emit(data),
            "payload": tonejs.emit(data),
        })
    return demos


def emit_js(demos: list[dict]) -> str:
    """Return deterministic JavaScript for docs/data.js."""
    payload = json.dumps(demos, indent=2, ensure_ascii=False)
    return (
        "/**\n"
        " * Generated from examples/*.json by `lilt demo-data`.\n"
        " * Do not edit by hand; edit examples, then regenerate.\n"
        " */\n"
        f"window.LILT_DEMOS = {payload};\n"
    )


def write_js(examples_dir: Path, output_path: Path) -> None:
    output_path.write_text(emit_js(build_demo_data(examples_dir)), encoding="utf-8", newline="\n")


def _title_from_slug(slug: str) -> str:
    if slug == "boots-cats":
        return "Boots-cats groove"
    if slug == "mary-had-a-little-lamb":
        return "Mary Had a Little Lamb"
    if slug == "three-note-hum":
        return "Three-note hum"
    return slug.replace("-", " ").title()
