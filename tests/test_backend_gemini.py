"""GeminiBackend tests.

These do not call the network. The real backend is optional and should stay
mockable so the repo remains buildable when API quota is unavailable.
"""

from __future__ import annotations

import json
import importlib.util

import pytest

from lilt import schema
from lilt.backends.gemini import GeminiBackend, _inline_schema_refs


class _Part:
    @staticmethod
    def from_bytes(*, data, mime_type):
        return {"inline_data": data, "mime_type": mime_type}


class _Config:
    def __init__(self, **kwargs):
        self.kwargs = kwargs


class _Types:
    Part = _Part
    GenerateContentConfig = _Config


class _Models:
    def __init__(self):
        self.seen = None

    def generate_content(self, **kwargs):
        self.seen = kwargs
        return type("Response", (), {"text": json.dumps({"ok": True})})()


class _Client:
    def __init__(self):
        self.models = _Models()


def test_gemini_backend_calls_sdk_with_schema_and_audio():
    client = _Client()
    backend = GeminiBackend(client=client, types_module=_Types)
    out = backend.generate(
        system="system",
        audio=b"wav",
        text='{"duration_s": 1}',
        response_schema={"type": "object"},
        temperature=0.1,
    )

    assert json.loads(out) == {"ok": True}
    seen = client.models.seen
    assert seen["model"] == "gemma-4-26b-a4b-it"
    assert seen["contents"][0]["inline_data"] == b"wav"
    assert seen["config"].kwargs["response_mime_type"] == "application/json"
    assert seen["config"].kwargs["response_schema"] == {"type": "object"}


def test_inline_schema_refs_removes_refs_without_mutating_contract_schema():
    gemini_schema = _inline_schema_refs(schema.LILT_JSON_SCHEMA)
    encoded = json.dumps(gemini_schema)

    assert "$ref" not in encoded
    assert "additionalProperties" not in encoded
    assert "$defs" not in gemini_schema
    assert "$schema" not in gemini_schema
    assert gemini_schema["properties"]["voices"]["items"]["properties"]["bars"]
    assert schema.LILT_JSON_SCHEMA["properties"]["voices"]["items"] == {
        "$ref": "#/$defs/voice",
    }


def test_gemini_backend_missing_dependency_has_clear_error():
    try:
        has_google_genai = importlib.util.find_spec("google.genai") is not None
    except ModuleNotFoundError:
        has_google_genai = False
    if has_google_genai:
        pytest.skip("google-genai is installed in this environment")
    backend = GeminiBackend()
    with pytest.raises(RuntimeError, match="google-genai"):
        backend.generate(
            system="",
            audio=b"",
            text="{}",
            response_schema={},
        )
