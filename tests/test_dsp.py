"""DSP digest tests."""

from __future__ import annotations

import json
import math
import wave

from lilt import cli, dsp


def _write_sine_wav(path, *, freq=440.0, seconds=0.5, sample_rate=8000):
    frames = bytearray()
    total = int(seconds * sample_rate)
    for i in range(total):
        sample = int(0.55 * 32767 * math.sin(2 * math.pi * freq * (i / sample_rate)))
        frames.extend(sample.to_bytes(2, "little", signed=True))
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(bytes(frames))


def test_digest_wav_reports_basic_audio_facts(tmp_path):
    wav = tmp_path / "tone.wav"
    _write_sine_wav(wav, freq=440.0, seconds=0.5)

    out = dsp.digest_wav(wav)

    assert out["source"] == "tone.wav"
    assert out["duration_s"] == 0.5
    assert out["sample_rate"] == 8000
    assert out["channels"] == 1
    assert out["rms"] > 0.2
    assert out["peak"] > 0.5
    assert "A4" in out["pitch_trace"]


def test_digest_cli_writes_json(tmp_path):
    wav = tmp_path / "tone.wav"
    _write_sine_wav(wav)
    out = tmp_path / "digest.json"

    code = cli.main(["digest", str(wav), "-o", str(out)])

    assert code == 0
    payload = json.loads(out.read_text(encoding="utf-8"))
    assert payload["source"] == "tone.wav"
    assert payload["pitch_trace"]


def test_digest_cli_missing_file_exits_nonzero(tmp_path, capsys):
    code = cli.main(["digest", str(tmp_path / "missing.wav")])

    assert code != 0
    assert "not found" in capsys.readouterr().err.lower()
