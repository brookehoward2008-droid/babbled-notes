"""FakeBackend: canned JSON responses for tests and offline development.

Per INTEGRATIONS.MD: 'FakeBackend exists so the entire pipeline (parser,
codegen, MIDI emitter, UI) can be tested end-to-end without ever calling
a real model.'
"""

from __future__ import annotations

import json
from typing import Optional

from . import LLMBackend  # noqa: F401  (Protocol; kept for type clarity)


class FakeBackend:
    """Returns canned JSON responses keyed by exact audio bytes.

    Construct with:
      - `responses`: dict mapping audio bytes -> response dict
      - `default`: response dict used when audio is not in `responses`

    If neither matches, generate() raises KeyError. That makes test
    failures loud rather than silently returning a wrong response.
    """

    def __init__(
        self,
        responses: Optional[dict[bytes, dict]] = None,
        default: Optional[dict] = None,
    ) -> None:
        self._responses: dict[bytes, dict] = dict(responses or {})
        self._default: Optional[dict] = default

    def generate(
        self,
        *,
        system: str,
        audio: bytes,
        text: str,
        response_schema: dict,
        temperature: float = 0.2,
    ) -> str:
        if audio in self._responses:
            payload = self._responses[audio]
        elif self._default is not None:
            payload = self._default
        else:
            raise KeyError(
                f"FakeBackend has no canned response for audio of length "
                f"{len(audio)} bytes and no default was provided."
            )
        # sort_keys=True so the same dict always serializes the same way.
        return json.dumps(payload, sort_keys=True, separators=(",", ":"))
