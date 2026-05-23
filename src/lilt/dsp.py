"""Small WAV-to-digest helper for the Lilt audio pipeline.

This is intentionally lightweight. It does not try to be a full transcription
engine; it gives Gemma stable facts about timing, energy, and rough pitch.
"""

from __future__ import annotations

import math
import wave
from pathlib import Path


def digest_wav(path: str | Path) -> dict:
    """Read a PCM WAV file and return a compact DSP digest."""
    wav_path = Path(path)
    with wave.open(str(wav_path), "rb") as wf:
        channels = wf.getnchannels()
        sample_width = wf.getsampwidth()
        sample_rate = wf.getframerate()
        frame_count = wf.getnframes()
        raw = wf.readframes(frame_count)

    samples = _decode_pcm(raw, sample_width, channels)
    duration_s = frame_count / sample_rate if sample_rate else 0.0
    mono = _to_mono(samples, channels)
    rms = _rms(mono)
    peak = max((abs(s) for s in mono), default=0.0)
    onsets = _estimate_onsets(mono, sample_rate)
    bpm = _estimate_bpm(onsets)
    pitch_trace = _estimate_pitch_trace(mono, sample_rate)
    quality = describe_quality(rms=rms, peak=peak, samples=mono)
    features = describe_features(onsets=onsets, pitch_trace=pitch_trace, duration_s=duration_s)

    digest = {
        "source": wav_path.name,
        "duration_s": round(duration_s, 3),
        "sample_rate": sample_rate,
        "channels": channels,
        "rms": round(rms, 4),
        "peak": round(peak, 4),
        "onsets": onsets,
        "pitch_trace": pitch_trace,
        "quality": quality,
        "features": features,
    }
    if bpm is not None:
        digest["estimated_bpm"] = bpm
    if pitch_trace:
        digest["estimated_key"] = _rough_key(pitch_trace)
    return digest


def describe_quality(*, rms: float, peak: float, samples: list[float]) -> dict:
    """Return compact recording-quality facts for model and UI feedback."""
    silence_ratio = _silence_ratio(samples)
    clipped = peak >= 0.985
    if rms < 0.008 or silence_ratio > 0.92:
        level = "too_quiet"
    elif clipped:
        level = "clipped"
    elif rms > 0.45:
        level = "very_loud"
    else:
        level = "usable"
    return {
        "level": level,
        "clipped": clipped,
        "silence_ratio": round(silence_ratio, 3),
        "dynamic_range": round(max(0.0, peak - rms), 4),
    }


def describe_features(*, onsets: list[float], pitch_trace: list[str], duration_s: float) -> dict:
    """Return music-facing features that help Gemma translate precisely."""
    return {
        "onset_count": len(onsets),
        "pitch_count": len(pitch_trace),
        "pitch_direction": _pitch_direction(pitch_trace),
        "gesture_density": _gesture_density(onsets, duration_s),
    }


def _decode_pcm(raw: bytes, sample_width: int, channels: int) -> list[float]:
    if channels < 1:
        raise ValueError("WAV must have at least one channel")
    if sample_width == 1:
        return [(b - 128) / 128.0 for b in raw]
    if sample_width == 2:
        return [
            int.from_bytes(raw[i:i + 2], "little", signed=True) / 32768.0
            for i in range(0, len(raw), 2)
        ]
    if sample_width == 3:
        out = []
        for i in range(0, len(raw), 3):
            chunk = raw[i:i + 3]
            sign = b"\xff" if chunk[2] & 0x80 else b"\x00"
            out.append(int.from_bytes(chunk + sign, "little", signed=True) / 8388608.0)
        return out
    if sample_width == 4:
        return [
            int.from_bytes(raw[i:i + 4], "little", signed=True) / 2147483648.0
            for i in range(0, len(raw), 4)
        ]
    raise ValueError(f"unsupported WAV sample width: {sample_width} bytes")


def _to_mono(samples: list[float], channels: int) -> list[float]:
    if channels == 1:
        return samples
    mono = []
    for i in range(0, len(samples), channels):
        frame = samples[i:i + channels]
        if len(frame) == channels:
            mono.append(sum(frame) / channels)
    return mono


def _rms(samples: list[float]) -> float:
    if not samples:
        return 0.0
    return math.sqrt(sum(s * s for s in samples) / len(samples))


def _silence_ratio(samples: list[float]) -> float:
    if not samples:
        return 1.0
    silent = sum(1 for sample in samples if abs(sample) < 0.012)
    return silent / len(samples)


def _estimate_onsets(samples: list[float], sample_rate: int) -> list[float]:
    if not samples or sample_rate <= 0:
        return []
    frame = max(1, int(sample_rate * 0.04))
    hop = max(1, int(sample_rate * 0.02))
    energies = []
    for start in range(0, max(1, len(samples) - frame + 1), hop):
        energies.append(_rms(samples[start:start + frame]))
    if not energies:
        return []

    floor = sorted(energies)[len(energies) // 2]
    threshold = max(floor * 2.5, max(energies) * 0.18, 0.015)
    onsets = []
    last_time = -1.0
    for idx, energy in enumerate(energies):
        prev_energy = energies[idx - 1] if idx else 0.0
        time_s = round((idx * hop) / sample_rate, 3)
        if energy >= threshold and energy > prev_energy * 1.35 and time_s - last_time >= 0.12:
            onsets.append(time_s)
            last_time = time_s
    return onsets[:32]


def _estimate_bpm(onsets: list[float]) -> int | None:
    intervals = [
        round(b - a, 3)
        for a, b in zip(onsets, onsets[1:])
        if 0.2 <= b - a <= 2.5
    ]
    if not intervals:
        return None
    interval = sorted(intervals)[len(intervals) // 2]
    bpm = 60.0 / interval
    while bpm < 60:
        bpm *= 2
    while bpm > 180:
        bpm /= 2
    return int(round(bpm))


def _estimate_pitch_trace(samples: list[float], sample_rate: int) -> list[str]:
    if not samples or sample_rate <= 0:
        return []
    frame = max(1, int(sample_rate * 0.08))
    hop = max(1, int(sample_rate * 0.16))
    notes = []
    for start in range(0, max(1, len(samples) - frame + 1), hop):
        chunk = samples[start:start + frame]
        if _rms(chunk) < 0.02:
            continue
        freq = _autocorrelation_pitch(chunk, sample_rate)
        if freq is None:
            continue
        note = _freq_to_note(freq)
        if not notes or notes[-1] != note:
            notes.append(note)
    return notes[:16]


def _autocorrelation_pitch(samples: list[float], sample_rate: int) -> float | None:
    min_freq = 80.0
    max_freq = 1000.0
    min_lag = max(1, int(sample_rate / max_freq))
    max_lag = min(len(samples) // 2, int(sample_rate / min_freq))
    if max_lag <= min_lag:
        return None

    mean = sum(samples) / len(samples)
    centered = [s - mean for s in samples]
    best_lag = 0
    best_score = 0.0
    for lag in range(min_lag, max_lag + 1):
        score = 0.0
        for i in range(0, len(centered) - lag, 2):
            score += centered[i] * centered[i + lag]
        if score > best_score:
            best_score = score
            best_lag = lag
    if best_lag == 0 or best_score <= 0:
        return None
    return sample_rate / best_lag


def _freq_to_note(freq: float) -> str:
    midi = int(round(69 + 12 * math.log2(freq / 440.0)))
    names = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")
    return f"{names[midi % 12]}{(midi // 12) - 1}"


def _pitch_direction(notes: list[str]) -> str:
    midi_values = [_note_to_midi(note) for note in notes if _note_to_midi(note) is not None]
    if len(midi_values) < 2:
        return "steady"
    delta = midi_values[-1] - midi_values[0]
    if delta >= 3:
        return "rising"
    if delta <= -3:
        return "falling"
    span = max(midi_values) - min(midi_values)
    if span >= 5:
        return "arched"
    return "steady"


def _gesture_density(onsets: list[float], duration_s: float) -> str:
    if duration_s <= 0:
        return "sparse"
    density = len(onsets) / duration_s
    if density >= 5:
        return "dense"
    if density >= 2:
        return "moderate"
    return "sparse"


def _note_to_midi(note: str) -> int | None:
    if len(note) < 2:
        return None
    names = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5,
             "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
    if note[1:2] in {"#", "b"}:
      name = note[:2]
      octave_text = note[2:]
    else:
      name = note[:1]
      octave_text = note[1:]
    if name not in names or not octave_text.isdigit():
        return None
    return (int(octave_text) + 1) * 12 + names[name]


def _rough_key(notes: list[str]) -> str:
    first = notes[0]
    root = first[:-1] if first[-1].isdigit() else first
    return f"{root} major"
