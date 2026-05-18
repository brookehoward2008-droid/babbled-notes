"""FakeBackend tests.

FakeBackend serves canned JSON responses keyed by audio hash so the
parser, codegen, MIDI emitter, and UI can be tested end-to-end without
ever calling a real model. Per INTEGRATIONS.MD.
"""

from __future__ import annotations

import json

import pytest

from lilt.backends.fake import FakeBackend


def test_returns_canned_json_for_known_audio(canonical_example):
    audio = b"fake-audio-bytes-1"
    digest = {"duration_s": 3.0}
    backend = FakeBackend(responses={audio: canonical_example})
    out = backend.generate(
        system="ignored", audio=audio, text=json.dumps(digest),
        response_schema={}, temperature=0.2,
    )
    assert json.loads(out) == canonical_example


def test_unknown_audio_returns_default(canonical_example):
    backend = FakeBackend(default=canonical_example)
    out = backend.generate(
        system="", audio=b"never-seen", text="{}",
        response_schema={}, temperature=0.2,
    )
    assert json.loads(out) == canonical_example


def test_unknown_audio_no_default_raises():
    backend = FakeBackend()
    with pytest.raises(KeyError):
        backend.generate(
            system="", audio=b"unknown", text="{}",
            response_schema={}, temperature=0.2,
        )


def test_output_is_deterministic_string(canonical_example):
    """Returns a stable JSON string for the same input."""
    backend = FakeBackend(default=canonical_example)
    a = backend.generate(system="", audio=b"x", text="{}",
                         response_schema={}, temperature=0.0)
    b = backend.generate(system="", audio=b"x", text="{}",
                         response_schema={}, temperature=0.0)
    assert a == b


def test_implements_llmbackend_protocol(canonical_example):
    """Duck-typed protocol check: callable with the expected kwargs."""
    from lilt.backends import LLMBackend
    backend: LLMBackend = FakeBackend(default=canonical_example)
    out = backend.generate(system="", audio=b"x", text="{}",
                           response_schema={}, temperature=0.2)
    assert isinstance(out, str)


def test_response_is_schema_valid(canonical_example):
    """The canned response, parsed, must validate against the Lilt schema."""
    from lilt import schema
    backend = FakeBackend(default=canonical_example)
    out = backend.generate(system="", audio=b"x", text="{}",
                           response_schema={}, temperature=0.2)
    schema.validate(json.loads(out))
