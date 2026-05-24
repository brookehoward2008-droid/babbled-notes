# Integrations

How Lilt talks to Gemma 4, where files live, and what is deliberately parked.

## Gemma 4 backend abstraction

Gemma is reached through one protocol. The pipeline calls the protocol once and
then validates the returned JSON before codegen, MIDI, or Tone.js sees it.

```python
class LLMBackend(Protocol):
    def generate(
        self,
        *,
        system: str,
        audio: bytes,           # short user audio clip
        text: str,              # JSON-encoded DSP digest
        response_schema: dict,  # Lilt JSON schema
        temperature: float = 0.2,
    ) -> str: ...               # raw JSON string
```

### Implementations

| Backend | Use | Status |
|---|---|---|
| `GeminiBackend` | Hosted Gemma 4 via Google AI Studio / Gemini API | implemented, optional dependency |
| `FakeBackend` | Canned JSON response for a given run | implemented, zero network |
| `OllamaBackend` | Local runtime target | parked until Gemma 4 audio support is verified locally |
| `TransformersBackend` | Heavy local fallback | parked until needed |

Official contest/API notes checked on May 18, 2026:

- The DEV Gemma 4 Challenge accepts any Gemma 4 model doing real work.
- The challenge page lists free paths: Gemini API through Google AI Studio,
  local downloads from Hugging Face/Kaggle, and OpenRouter free tier.
- Google's Gemma-on-Gemini docs list `gemma-4-31b-it` and
  `gemma-4-26b-a4b-it` as API-supported Gemma 4 models.
- Free API quota is rate-limited per project and should be checked in AI
  Studio before recording or submitting demos.

## CLI paths

Compile an already-valid Lilt JSON contract:

```powershell
python -m lilt.cli digest path\to\clip.wav
python -m lilt.cli compile examples\three_note_hum.json
python -m lilt.cli tonejs examples\three_note_hum.json
python -m lilt.cli info examples\three_note_hum.json
```

Run the full pipeline through a backend:

```powershell
python -m lilt.cli audio path\to\clip.wav --digest examples\three_note_hum.digest.json --backend gemini
```

For Google AI Studio keys, set either `GEMINI_API_KEY` or `GOOGLE_API_KEY` in
the local shell or deployment secret store. The public browser demo stays
keyless; model calls belong in CLI/server execution.

Offline/quota-out demo path:

```powershell
python -m lilt.cli audio path\to\clip.wav `
  --digest examples\three_note_hum.digest.json `
  --backend fake `
  --fake-response examples\three_note_hum.json
```

## Static browser demo

`docs/` is a static Tone.js demo. Its data is generated from `examples/*.json`:

```powershell
python -m lilt.cli demo-data
```

That keeps examples, compiler output, and the browser preview aligned.

## File rules

Lilt files are git-native by spec:

- Plain UTF-8, LF newlines.
- Deterministic codegen: same JSON in -> byte-identical text out.
- No embedded timestamps, run-dependent IDs, or compiler-inserted comments.
- Stable voice names when the model output is identical.

## Parked work

- Browser recording and DSP digest generation.
- A real eval harness with audio fixtures.
- Local Ollama or Transformers backend once the target Gemma 4 runtime path is
  verified for audio input.
