"""Gemini API backend for hosted Gemma 4.

This backend is optional. Install with `pip install -e .[gemini]` and provide
`GOOGLE_API_KEY` or the SDK's configured credentials before using it.
"""

from __future__ import annotations

from copy import deepcopy
import json
from typing import Any

from . import LLMBackend  # noqa: F401  (Protocol; kept for type clarity)


class GeminiBackend:
    """Calls Gemma 4 through the Gemini API / Google AI Studio key path."""

    def __init__(
        self,
        *,
        model: str = "gemma-4-26b-a4b-it",
        audio_mime_type: str = "audio/wav",
        client: Any | None = None,
        types_module: Any | None = None,
    ) -> None:
        self.model = model
        self.audio_mime_type = audio_mime_type
        self._client = client
        self._types = types_module

    def generate(
        self,
        *,
        system: str,
        audio: bytes,
        text: str,
        response_schema: dict,
        temperature: float = 0.2,
    ) -> str:
        client, types = self._client_and_types()
        contents = self._contents(types, audio, text)
        gemini_schema = _inline_schema_refs(response_schema)
        config = types.GenerateContentConfig(
            system_instruction=system,
            temperature=temperature,
            response_mime_type="application/json",
            response_schema=gemini_schema,
        )
        response = client.models.generate_content(
            model=self.model,
            contents=contents,
            config=config,
        )
        return _response_text(response)

    def _client_and_types(self):
        if self._client is not None and self._types is not None:
            return self._client, self._types

        try:
            from google import genai
            from google.genai import types
        except ImportError as e:
            raise RuntimeError(
                "GeminiBackend requires google-genai. Install it with "
                "`pip install -e .[gemini]`."
            ) from e
        return genai.Client(), types

    def _contents(self, types, audio: bytes, text: str):
        prompt = (
            "Return only Lilt JSON matching the supplied schema. "
            f"DSP digest: {text}"
        )
        if not audio:
            return prompt
        return [
            types.Part.from_bytes(data=audio, mime_type=self.audio_mime_type),
            prompt,
        ]


def _inline_schema_refs(schema: dict) -> dict:
    """Return a Gemini-friendly schema without JSON Schema internal refs."""
    root = deepcopy(schema)

    def resolve_ref(ref: str) -> Any:
        if not ref.startswith("#/"):
            raise ValueError(f"Unsupported schema ref for Gemini backend: {ref}")
        node: Any = root
        for part in ref[2:].split("/"):
            node = node[part]
        return node

    def walk(node: Any) -> Any:
        if isinstance(node, list):
            return [walk(item) for item in node]
        if not isinstance(node, dict):
            return node

        if "$ref" in node:
            resolved = walk(resolve_ref(node["$ref"]))
            extras = {key: value for key, value in node.items() if key != "$ref"}
            if extras and isinstance(resolved, dict):
                resolved = {**resolved, **walk(extras)}
            return resolved

        cleaned = {
            key: walk(value)
            for key, value in node.items()
            if key not in {"$schema", "$defs", "additionalProperties"}
        }
        return cleaned

    return walk(root)


def _response_text(response: Any) -> str:
    text = getattr(response, "text", None)
    if isinstance(text, str) and text.strip():
        return text

    # Some SDK versions expose candidates/parts more directly. Keep this small
    # and deterministic so the pipeline still owns JSON parsing and validation.
    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        for part in parts:
            part_text = getattr(part, "text", None)
            if isinstance(part_text, str) and part_text.strip():
                return part_text

    try:
        return json.dumps(response.to_json_dict(), sort_keys=True)
    except AttributeError as e:
        raise ValueError("Gemini response did not contain text.") from e
