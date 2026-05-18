"""Schema contract tests."""

from __future__ import annotations

import jsonschema
import pytest

from lilt import schema


def test_canonical_example_validates(canonical_example):
    schema.validate(canonical_example)


def test_canonical_drum_example_validates(canonical_drum_example):
    schema.validate(canonical_drum_example)


def test_missing_required_field_fails():
    bad = {"tempo": 80, "feel": "straight", "key": {"root": "C", "mode": "major"}}
    with pytest.raises(jsonschema.ValidationError):
        schema.validate(bad)


def test_unknown_mood_fails(canonical_example):
    canonical_example["mood"] = ["funky"]  # not in MOODS
    with pytest.raises(jsonschema.ValidationError):
        schema.validate(canonical_example)


def test_invalid_pitch_fails(canonical_example):
    canonical_example["voices"][0]["bars"][0][0]["pitch"] = "H4"  # H is not a note name
    with pytest.raises(jsonschema.ValidationError):
        schema.validate(canonical_example)


def test_description_field_accepted(canonical_example):
    canonical_example["description"] = "a slow, three-note ascending hum, gentle and intimate"
    schema.validate(canonical_example)


def test_schema_url_is_clean():
    """Bug fix: $schema URL had stray angle brackets from markdown autolinks."""
    url = schema.LILT_JSON_SCHEMA["$schema"]
    assert "<" not in url
    assert ">" not in url
    assert url == "https://json-schema.org/draft/2020-12/schema"


def test_is_valid_returns_bool(canonical_example):
    assert schema.is_valid(canonical_example) is True
    canonical_example["tempo"] = "fast"  # wrong type
    assert schema.is_valid(canonical_example) is False
