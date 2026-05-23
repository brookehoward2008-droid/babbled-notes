"""Gemini TTS voice rendering for Babbled Notes."""

from __future__ import annotations

from pathlib import Path
from typing import Any
import base64
import wave


STYLE_PROMPTS = {
    "bach": "structured, clear, flowing Baroque phrasing",
    "beethoven": "bold, dramatic, emotionally driven classical phrasing",
    "mozart": "bright, balanced, elegant classical phrasing",
    "chopin": "gentle, intimate, lyrical Romantic phrasing",
}


def prompt_for_voice(data: dict, style: str = "chopin") -> str:
    """Build the text prompt sent to Gemini TTS."""

    style_key = style.lower()
    style_text = STYLE_PROMPTS.get(style_key, STYLE_PROMPTS["chopin"])
    tempo = data.get("tempo", 80)
    key = data.get("key", {})
    key_text = f"{key.get('root', 'C')} {key.get('mode', 'major')}"
    mood = ", ".join(data.get("mood", [])) or "expressive"
    phrases = _voice_phrases(data)
    phrase_text = "\n".join(f"- {line}" for line in phrases) or "- ah"

    return (
        "Vocalize this short musical idea as an expressive human-style hum.\n"
        "Use open vowels like ah, ooh, and la. Do not speak the note names.\n"
        "Make it feel like a small classical composition sketch, not a robot scale.\n"
        f"Style: {style_text}.\n"
        f"Tempo: about {tempo} bpm.\n"
        f"Key mood: {key_text}; {mood}.\n"
        "Phrase map:\n"
        f"{phrase_text}\n"
        "Performance: warm, musical, steady, and emotionally inviting."
    )


def render_voice(
    data: dict,
    output_path: str | Path,
    *,
    style: str = "chopin",
    voice_name: str = "Kore",
    model: str = "gemini-3.1-flash-tts-preview",
    client: Any | None = None,
    types_module: Any | None = None,
) -> Path:
    """Render a WAV file using Gemini TTS."""

    client, types = _client_and_types(client, types_module)
    response = client.models.generate_content(
        model=model,
        contents=prompt_for_voice(data, style),
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=voice_name,
                    )
                )
            ),
        ),
    )
    pcm = _response_audio(response)
    out = Path(output_path)
    _write_wav(out, pcm)
    return out


def _client_and_types(client: Any | None, types_module: Any | None):
    if client is not None and types_module is not None:
        return client, types_module
    try:
        from google import genai
        from google.genai import types
    except ImportError as e:
        raise RuntimeError(
            "AI voice rendering requires google-genai. Install with "
            "`pip install -e .[gemini]` and set GEMINI_API_KEY or GOOGLE_API_KEY."
        ) from e
    return genai.Client(), types


def _response_audio(response: Any) -> bytes:
    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        for part in parts:
            inline_data = getattr(part, "inline_data", None) or getattr(part, "inlineData", None)
            data = getattr(inline_data, "data", None)
            if isinstance(data, bytes):
                return data
            if isinstance(data, str):
                return base64.b64decode(data)
    raise ValueError("Gemini TTS response did not contain inline audio data.")


def _write_wav(path: Path, pcm: bytes, channels: int = 1, rate: int = 24000) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        wf.writeframes(pcm)


def _voice_phrases(data: dict) -> list[str]:
    lines: list[str] = []
    for voice in data.get("voices", []):
        if voice.get("kind") == "drum":
            continue
        tokens: list[str] = []
        for bar in voice.get("bars", []):
            for event in bar:
                if event.get("t") == "note":
                    syllable = "ahh" if event.get("hold") else "la"
                    dynamic = event.get("dynamic", "mf")
                    tokens.append(f"{syllable}({event.get('pitch', '?')}, {dynamic})")
                elif event.get("t") == "rest":
                    tokens.append("[short pause]")
        if tokens:
            name = voice.get("name", "voice")
            lines.append(f"{name}: {' '.join(tokens)}")
    return lines
