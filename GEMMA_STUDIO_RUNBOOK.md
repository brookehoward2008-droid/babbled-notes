# Google AI Studio Runbook

Use this when you want a true Gemma-backed result instead of the public
browser demo's local deterministic seed.

## Safety rule

Keep the API key in your local shell or deployment secrets. Do not paste it
into source files, GitHub Pages, screenshots, issues, or DEV comments.

Google's Gemini API libraries can read either `GEMINI_API_KEY` or
`GOOGLE_API_KEY` from the environment.

## One-time setup

```powershell
cd C:\Users\toddl\OneDrive\Documents\GitHub\babbled-notes
pip install -e .[gemini]
$env:PYTHONPATH = "src"
```

Set the key only in the current terminal:

```powershell
[Environment]::SetEnvironmentVariable(
  "GEMINI_API_KEY",
  (Read-Host "Paste Google AI Studio key"),
  "Process"
)
```

## Real model run

For the cleanest proof run, use a short WAV file:

```powershell
python -m lilt.cli digest path\to\clip.wav -o out\clip.digest.json
python -m lilt.cli audio path\to\clip.wav --digest out\clip.digest.json --backend gemini --output-base out\clip.gemma
```

Expected artifacts:

- `out\clip.gemma.json`
- `out\clip.gemma.lilt`
- `out\clip.gemma.mid`

That is the full path:

```text
audio bytes + DSP digest -> Gemma 4 -> schema-valid JSON -> .lilt + MIDI
```

## Browser demo boundary

The public GitHub Pages demo is intentionally keyless. It records audio locally,
builds a browser-side digest, and creates deterministic starter `.lilt` code.

The Google AI Studio key belongs in CLI/server execution only.
