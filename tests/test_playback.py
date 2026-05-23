"""Playback plan tests."""

from __future__ import annotations

from lilt import playback


def test_plan_from_lilt_adds_depth_and_quality(canonical_example):
    plan = playback.plan_from_lilt(canonical_example, style="beethoven", space="concert-hall")

    assert plan["style"] == "beethoven"
    assert plan["space"] == "concert-hall"
    assert 0.0 <= plan["depth"] <= 1.0
    assert plan["instrument_layers"]
    assert plan["humanize_ms"] >= 10
    assert plan["variation"]["repeat_mode"] == "evolve"
    playback.validate_plan(plan)


def test_playback_prompt_mentions_vocal_depth_without_medical_claims(canonical_example):
    prompt = playback.prompt_for_plan(canonical_example, style="chopin", space="room")

    assert "playback production plan" in prompt
    assert "vocal depth" in prompt
    assert "Do not make medical claims" in prompt
    assert "chopin" in prompt
