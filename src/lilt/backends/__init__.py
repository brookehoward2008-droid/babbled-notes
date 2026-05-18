"""LLM backend abstractions.

INTEGRATIONS.MD defines a single Protocol with several implementations:
GeminiBackend (hosted), OllamaBackend (local), TransformersBackend
(local), and FakeBackend (testing). All conform to LLMBackend.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class LLMBackend(Protocol):
    """Single contract for every Gemma 4 (or stand-in) backend.

    The pipeline never imports a concrete backend directly; it accepts an
    LLMBackend and calls `.generate(...)` once per audio clip. That keeps
    the same pipeline code working in hosted dev, local demo, and tests.
    """

    def generate(
        self,
        *,
        system: str,
        audio: bytes,
        text: str,
        response_schema: dict,
        temperature: float = 0.2,
    ) -> str:
        """Return a raw JSON string. Pipeline parses and validates it."""
        ...
