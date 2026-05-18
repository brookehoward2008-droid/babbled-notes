"""End-to-end compile pipeline: audio + digest -> JSON -> Lilt source + MIDI.

Pipeline is the only code that talks to a backend. Every other module
(schema, codegen, midi) is a pure function over JSON.
"""

from __future__ import annotations

import json
from dataclasses import dataclass

from . import codegen, midi, schema
from .backends import LLMBackend
from .prompts import SYSTEM_PROMPT


@dataclass(frozen=True)
class CompileResult:
    """The three artifacts of a successful compile.

    `json_data` is the structured contract returned by the backend.
    `lilt_source` is the human-readable program (UTF-8, LF, trailing \\n).
    `midi_bytes` is a Standard MIDI File ready to write to disk or stream.
    """

    json_data: dict
    lilt_source: str
    midi_bytes: bytes


def compile_audio(
    *,
    audio: bytes,
    digest: dict,
    backend: LLMBackend,
    temperature: float = 0.2,
) -> CompileResult:
    """Run a single audio clip through the full pipeline.

    Raises:
      ValueError: backend returned text that did not parse as JSON.
      jsonschema.ValidationError: backend returned JSON that did not
        conform to the Lilt schema.
    """
    raw = backend.generate(
        system=SYSTEM_PROMPT,
        audio=audio,
        text=json.dumps(digest, sort_keys=True),
        response_schema=schema.LILT_JSON_SCHEMA,
        temperature=temperature,
    )
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Backend response is not valid JSON: {e.msg}") from e

    schema.validate(data)

    return CompileResult(
        json_data=data,
        lilt_source=codegen.emit(data),
        midi_bytes=midi.emit(data),
    )
