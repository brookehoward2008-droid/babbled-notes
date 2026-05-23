"""Prompt contract tests."""

from __future__ import annotations

from lilt import prompts


def test_system_prompt_includes_quality_and_vocal_guidance():
    text = prompts.SYSTEM_PROMPT

    assert "digest.quality" in text
    assert "digest.features" in text
    assert "VOCAL GESTURE LIBRARY" in text
    assert "Do not invent schema fields" in text
