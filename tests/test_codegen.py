"""Codegen contract tests.

These lock the determinism contract from GRAMMAR.md: same JSON in -> byte-identical
text out, UTF-8 LF, exactly one trailing newline.
"""

from __future__ import annotations

from lilt import codegen


def test_canonical_example_emits_expected_text(canonical_example):
    """The output for the SCHEMA.MD worked example is locked."""
    expected = (
        "tempo 80\n"
        "feel straight\n"
        "key C major\n"
        "\n"
        "mood gentle, intimate\n"
        "\n"
        "voice voice:\n"
        "  C4 ! soft E4 ! soft G4 hold ! soft\n"
    )
    assert codegen.emit(canonical_example) == expected


def test_emit_is_deterministic(canonical_example):
    """Same input -> byte-identical output every time."""
    a = codegen.emit(canonical_example)
    b = codegen.emit(canonical_example)
    assert a == b
    assert a.encode("utf-8") == b.encode("utf-8")


def test_emit_uses_lf_only(canonical_example):
    """No CRLF, no BOM."""
    out = codegen.emit(canonical_example)
    assert "\r" not in out
    assert not out.startswith("﻿")


def test_emit_ends_with_exactly_one_newline(canonical_example):
    out = codegen.emit(canonical_example)
    assert out.endswith("\n")
    assert not out.endswith("\n\n")


def test_drum_example_emits_expected_text(canonical_drum_example):
    expected = (
        "tempo 96\n"
        "feel swung-sixteenths\n"
        "key C major\n"
        "\n"
        "mood loose, playful\n"
        "\n"
        "voice kick:\n"
        "  x . . . x . . .\n"
        "\n"
        "voice snare:\n"
        "  . . . . x . . .\n"
    )
    assert codegen.emit(canonical_drum_example) == expected


def test_description_emitted_as_header_comment(canonical_example):
    """Bug fix: SCHEMA accepts `description`, codegen must surface it.

    ACCESSIBILITY.MD commits to emitting a 1-2 sentence English description
    alongside the Lilt program. We surface it as a leading `# ...` comment line
    so screen readers hear it first and the artifact stays a single file.
    """
    canonical_example["description"] = "a slow, three-note ascending hum, gentle and intimate"
    out = codegen.emit(canonical_example)
    lines = out.splitlines()
    assert lines[0] == "# a slow, three-note ascending hum, gentle and intimate"
    assert lines[1] == ""
    assert lines[2] == "tempo 80"


def test_no_description_no_comment(canonical_example):
    """If description is absent, no leading comment is added."""
    out = codegen.emit(canonical_example)
    assert not out.startswith("#")


def test_description_multiline_collapsed(canonical_example):
    """Description with embedded newlines collapses to one line.

    A multi-line description would break the determinism contract for screen
    readers and the `# ` comment convention. Collapse to a single line.
    """
    canonical_example["description"] = "first line\nsecond line"
    out = codegen.emit(canonical_example)
    assert out.startswith("# first line second line\n")
