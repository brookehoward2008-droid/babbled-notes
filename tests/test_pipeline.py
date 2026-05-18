"""End-to-end pipeline tests.

The pipeline ties everything together: audio + DSP digest go to the
backend, the backend's JSON is validated, and codegen + midi produce
the user-facing artifacts.
"""

from __future__ import annotations

import json

import jsonschema
import pytest

from lilt import pipeline, schema
from lilt.backends.fake import FakeBackend


def test_compile_audio_returns_all_three_artifacts(canonical_example):
    audio = b"hum-bytes"
    digest = {"duration_s": 3.0, "estimated_bpm": 80, "estimated_key": "C major"}
    backend = FakeBackend(responses={audio: canonical_example})

    result = pipeline.compile_audio(audio=audio, digest=digest, backend=backend)

    assert result.json_data == canonical_example
    assert "voice voice:" in result.lilt_source
    assert result.midi_bytes[:4] == b"MThd"


def test_compile_audio_validates_backend_output(canonical_example):
    """A backend that lies about the schema should raise, not silently corrupt."""
    bad = dict(canonical_example)
    bad["mood"] = ["funky"]  # not in MOODS
    backend = FakeBackend(default=bad)
    with pytest.raises(jsonschema.ValidationError):
        pipeline.compile_audio(audio=b"x", digest={}, backend=backend)


def test_compile_audio_rejects_non_json():
    """If the backend returns non-JSON, the pipeline raises a clear error."""
    class BrokenBackend:
        def generate(self, *, system, audio, text, response_schema, temperature=0.2):
            return "this is not json at all"

    with pytest.raises(ValueError, match="not valid JSON"):
        pipeline.compile_audio(audio=b"x", digest={}, backend=BrokenBackend())


def test_compile_audio_passes_digest_as_text_to_backend():
    """The DSP digest reaches the backend as a JSON-encoded string."""
    seen = {}

    class RecordingBackend:
        def generate(self, *, system, audio, text, response_schema, temperature=0.2):
            seen["text"] = text
            seen["audio"] = audio
            seen["system"] = system
            return json.dumps({
                "tempo": 80, "feel": "straight",
                "key": {"root": "C", "mode": "major"},
                "mood": ["gentle"],
                "voices": [{"name": "v", "kind": "pitched", "instrument_hint": "x",
                            "bars": [[{"t": "rest"}]]}],
            })

    digest = {"duration_s": 1.0, "estimated_bpm": 90}
    pipeline.compile_audio(audio=b"abc", digest=digest, backend=RecordingBackend())

    assert json.loads(seen["text"]) == digest
    assert seen["audio"] == b"abc"
    assert "Lilt" in seen["system"]


def test_compile_audio_uses_lilt_schema_for_response_schema():
    """Pipeline passes the Lilt JSON schema to the backend as response_schema."""
    seen = {}

    class RecordingBackend:
        def generate(self, *, system, audio, text, response_schema, temperature=0.2):
            seen["response_schema"] = response_schema
            return json.dumps({
                "tempo": 80, "feel": "straight",
                "key": {"root": "C", "mode": "major"},
                "mood": ["gentle"],
                "voices": [{"name": "v", "kind": "pitched", "instrument_hint": "x",
                            "bars": [[{"t": "rest"}]]}],
            })

    pipeline.compile_audio(audio=b"x", digest={}, backend=RecordingBackend())
    assert seen["response_schema"] is schema.LILT_JSON_SCHEMA


def test_compile_audio_is_deterministic(canonical_example):
    audio = b"deterministic-input"
    backend = FakeBackend(responses={audio: canonical_example})

    a = pipeline.compile_audio(audio=audio, digest={}, backend=backend)
    b = pipeline.compile_audio(audio=audio, digest={}, backend=backend)
    assert a.lilt_source == b.lilt_source
    assert a.midi_bytes == b.midi_bytes
    assert a.json_data == b.json_data
