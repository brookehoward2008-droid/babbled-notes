# Integrations

How Lilt talks to Gemma 4, where files live, and what we deliberately defer.

## Gemma 4 backend abstraction

Gemma is touched through one Protocol with three implementations. Swappable at startup; same pipeline code in every mode.

```python
class LLMBackend(Protocol):
    def generate(
        self,
        *,
        system: str,
        audio: bytes,           # mono 16 kHz, ≤ 12 s
        text: str,              # JSON-encoded DSP digest
        response_schema: dict,  # Lilt JSON schema
        temperature: float = 0.2,
    ) -> str: ...               # raw JSON string
```

### Implementations

| Backend | Use | Status |
|---|---|---|
| `GeminiBackend` | Hosted Gemma 4 E4B via Google AI Studio API | dev default — fastest path to working pipeline |
| `OllamaBackend` | Local llama.cpp via Ollama at `localhost:11434` | demo target — verify audio support before committing |
| `TransformersBackend` | Local `AutoModelForMultimodalLM` (Hugging Face) | fallback for local; heaviest install |
| `FakeBackend` | Canned JSON responses keyed by audio hash | testing — zero network, zero model |

`FakeBackend` exists so the entire pipeline (parser, codegen, MIDI emitter, UI) can be tested end-to-end without ever calling a real model.

## Deployment plan

**Two-track development**, single codebase.

1. **Develop against `GeminiBackend`.** Audio multimodality is known-good on the hosted side. Day 1 working pipeline.
2. **Demo on `OllamaBackend` or `TransformersBackend`.** Local edge story for the submission video. Whichever of the two is stable on the target hardware by week 2 is the one we ship.

The submission post shows both paths. Local is the headline; hosted is the "develop without a GPU" answer for users who don't have local compute.

## File integrations

### v0.1 — file save/load + gist share

| Action | What it does | Auth |
|---|---|---|
| `Save .lilt` | Writes the current program to a `.lilt` file on disk | none |
| `Open .lilt` | Loads a `.lilt` file, runs through parser, replaces editor buffer | none |
| `Export .mid` | Writes the compiled MIDI to a `.mid` file on disk | none |
| `Share as Gist` | Creates a public gist of the `.lilt` file, copies URL to clipboard | one-time GitHub PAT, stored locally only |

PAT is **never** transmitted anywhere except `<api.github.com>` for the single gist-create call. Stored in OS keyring (`keyring` Python lib) on desktop; in `localStorage` only if the user explicitly opts in on web.

### v0.2 — repo mode (parked, not built)

`Save to my Lilt notebook` would let a user pick a GitHub repo and have the app commit + push `.lilt` files automatically. Real product feature: OAuth app registration, token refresh, branch awareness, conflict UI. **Out of scope for the May 24 submission.** Named here so the v0.1 abstraction (a `Storage` interface) is shaped correctly to add it later.

## Lilt files are git-native by spec

Enforced by the grammar (see `GRAMMAR.md`):

- Plain UTF-8, LF newlines.
- Deterministic codegen: same JSON in → byte-identical text out.
- No embedded timestamps. No run-dependent IDs. No comments auto-inserted by the compiler.
- Voice names are stable across recompiles when the input is identical.

These rules mean any external tool — `git diff`, GitHub PRs, `meld`, a screen reader — can compare two Lilt programs meaningfully.

## Eval harness

Lives in `eval/`. Purpose: catch schema drift and semantic regression in Gemma's output before it breaks the user-facing pipeline.

```
eval/
  fixtures/
    01-c-major-triad.wav
    01-c-major-triad.expected.json
    02-boots-cats.wav
    02-boots-cats.expected.json
    ...
  run_eval.py
  README.md
```

Each fixture is a short audio clip + the JSON we expect Gemma to emit. The harness reports:

- **Schema-valid rate** — does the output validate against `lilt.schema.json`?
- **Field-level accuracy** — `tempo` within ±5 BPM, `key.root` exact match, `feel` exact match, `mood` Jaccard similarity ≥ 0.5, etc.
- **Codegen stability** — does the same input produce the same Lilt text twice?

Goal for the submission: **≥ 90% schema-valid, ≥ 75% feel-correct, ≥ 80% key-correct** across 30 fixtures.

The eval is what we cite in the DEV submission post to prove "Gemma 4 is doing real work." Without numbers, that's just a claim.

## What this document does NOT cover

- UI layer (web vs. desktop vs. Pi) — separate decision, see `UI.md` (TBD).
- Audio recording / DSP digest implementation details — see `DSP.md` (TBD).
- The actual prompt and schema — see `SCHEMA.md`.
