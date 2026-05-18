(function () {
  const elements = {
    record: document.getElementById("record"),
    stop: document.getElementById("record-stop"),
    play: document.getElementById("record-play"),
    download: document.getElementById("record-download"),
    audio: document.getElementById("recording-player"),
    status: document.getElementById("record-status"),
    digestPreview: document.getElementById("digest-preview"),
    digestJson: document.getElementById("digest-json"),
    actions: document.querySelector(".recorder-actions"),
  };

  if (!elements.record || !elements.stop) return;

  let mediaRecorder = null;
  let stream = null;
  let chunks = [];
  let recordingUrl = "";
  let recordingBlob = null;
  let stopTimer = null;

  function setStatus(text) {
    elements.status.textContent = text;
  }

  function resetUrl() {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    recordingUrl = "";
    elements.audio.removeAttribute("src");
  }

  function setReady(blob, digest) {
    recordingBlob = blob;
    resetUrl();
    recordingUrl = URL.createObjectURL(blob);
    elements.audio.src = recordingUrl;
    elements.actions.classList.add("is-ready");
    elements.digestPreview.classList.add("is-ready");
    elements.digestJson.textContent = JSON.stringify(digest, null, 2);
    setStatus("Recording ready.");
  }

  function setRecording(active) {
    elements.record.disabled = active;
    elements.stop.disabled = !active;
    elements.record.classList.toggle("is-recording", active);
    elements.record.textContent = active ? "Recording..." : "Record";
  }

  async function startRecording() {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setStatus("Recording is not available in this browser.");
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setStatus("Microphone permission was not granted.");
      return;
    }

    chunks = [];
    elements.actions.classList.remove("is-ready");
    elements.digestPreview.classList.remove("is-ready");
    resetUrl();

    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    mediaRecorder.addEventListener("stop", finishRecording);
    mediaRecorder.start();
    setRecording(true);
    setStatus("Recording. Stop when the idea is captured.");
    stopTimer = setTimeout(stopRecording, 12000);
  }

  function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;
    mediaRecorder.stop();
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    setRecording(false);
    setStatus("Building digest...");
  }

  async function finishRecording() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    const mimeType = mediaRecorder && mediaRecorder.mimeType ? mediaRecorder.mimeType : "audio/webm";
    const blob = new Blob(chunks, { type: mimeType });
    try {
      const digest = await digestBlob(blob);
      setReady(blob, digest);
    } catch (e) {
      setStatus("Recording saved, but digest could not be built.");
      setReady(blob, {
        source: "browser-recording",
        mime_type: blob.type || "audio/webm",
        bytes: blob.size,
        error: "digest unavailable",
      });
    }
  }

  async function digestBlob(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const buffer = await context.decodeAudioData(arrayBuffer.slice(0));
    const samples = mixToMono(buffer);
    const sampleRate = buffer.sampleRate;
    const digest = {
      source: "browser-recording",
      mime_type: blob.type || "audio/webm",
      duration_s: round(buffer.duration, 3),
      sample_rate: sampleRate,
      channels: buffer.numberOfChannels,
      bytes: blob.size,
      rms: round(rms(samples), 4),
      peak: round(peak(samples), 4),
      onsets: estimateOnsets(samples, sampleRate),
      pitch_trace: estimatePitchTrace(samples, sampleRate),
    };
    const bpm = estimateBpm(digest.onsets);
    if (bpm) digest.estimated_bpm = bpm;
    if (digest.pitch_trace.length) digest.estimated_key = roughKey(digest.pitch_trace);
    await context.close();
    return digest;
  }

  function mixToMono(buffer) {
    const out = new Float32Array(buffer.length);
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const input = buffer.getChannelData(channel);
      for (let i = 0; i < input.length; i += 1) {
        out[i] += input[i] / buffer.numberOfChannels;
      }
    }
    return out;
  }

  function rms(samples) {
    if (!samples.length) return 0;
    let sum = 0;
    for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
    return Math.sqrt(sum / samples.length);
  }

  function peak(samples) {
    let max = 0;
    for (let i = 0; i < samples.length; i += 1) max = Math.max(max, Math.abs(samples[i]));
    return max;
  }

  function estimateOnsets(samples, sampleRate) {
    const frame = Math.max(1, Math.floor(sampleRate * 0.04));
    const hop = Math.max(1, Math.floor(sampleRate * 0.02));
    const energies = [];
    for (let start = 0; start + frame <= samples.length; start += hop) {
      energies.push(rms(samples.subarray(start, start + frame)));
    }
    if (!energies.length) return [];
    const sorted = [...energies].sort((a, b) => a - b);
    const floor = sorted[Math.floor(sorted.length / 2)];
    const threshold = Math.max(floor * 2.5, Math.max(...energies) * 0.18, 0.015);
    const onsets = [];
    let last = -1;
    energies.forEach((energy, idx) => {
      const prev = idx ? energies[idx - 1] : 0;
      const time = round((idx * hop) / sampleRate, 3);
      if (energy >= threshold && energy > prev * 1.35 && time - last >= 0.12) {
        onsets.push(time);
        last = time;
      }
    });
    return onsets.slice(0, 32);
  }

  function estimateBpm(onsets) {
    const intervals = [];
    for (let i = 1; i < onsets.length; i += 1) {
      const interval = onsets[i] - onsets[i - 1];
      if (interval >= 0.2 && interval <= 2.5) intervals.push(interval);
    }
    if (!intervals.length) return null;
    intervals.sort((a, b) => a - b);
    let bpm = 60 / intervals[Math.floor(intervals.length / 2)];
    while (bpm < 60) bpm *= 2;
    while (bpm > 180) bpm /= 2;
    return Math.round(bpm);
  }

  function estimatePitchTrace(samples, sampleRate) {
    const frame = Math.max(1, Math.floor(sampleRate * 0.08));
    const hop = Math.max(1, Math.floor(sampleRate * 0.16));
    const notes = [];
    for (let start = 0; start + frame <= samples.length; start += hop) {
      const chunk = samples.subarray(start, start + frame);
      if (rms(chunk) < 0.02) continue;
      const freq = autocorrelationPitch(chunk, sampleRate);
      if (!freq) continue;
      const note = freqToNote(freq);
      if (notes[notes.length - 1] !== note) notes.push(note);
    }
    return notes.slice(0, 16);
  }

  function autocorrelationPitch(samples, sampleRate) {
    const minLag = Math.max(1, Math.floor(sampleRate / 1000));
    const maxLag = Math.min(Math.floor(samples.length / 2), Math.floor(sampleRate / 80));
    if (maxLag <= minLag) return null;
    let mean = 0;
    for (let i = 0; i < samples.length; i += 1) mean += samples[i];
    mean /= samples.length;
    let bestLag = 0;
    let bestScore = 0;
    for (let lag = minLag; lag <= maxLag; lag += 1) {
      let score = 0;
      for (let i = 0; i < samples.length - lag; i += 2) {
        score += (samples[i] - mean) * (samples[i + lag] - mean);
      }
      if (score > bestScore) {
        bestScore = score;
        bestLag = lag;
      }
    }
    return bestLag ? sampleRate / bestLag : null;
  }

  function freqToNote(freq) {
    const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const midi = Math.round(69 + 12 * Math.log2(freq / 440));
    return `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
  }

  function roughKey(notes) {
    return `${notes[0].replace(/[0-9-]/g, "")} major`;
  }

  function round(value, places) {
    const scale = 10 ** places;
    return Math.round(value * scale) / scale;
  }

  function downloadRecording() {
    if (!recordingBlob) return;
    const ext = recordingBlob.type.includes("ogg") ? "ogg" : "webm";
    const a = document.createElement("a");
    a.href = recordingUrl;
    a.download = `lilt-recording.${ext}`;
    a.click();
  }

  document.addEventListener("DOMContentLoaded", () => {
    elements.stop.disabled = true;
    elements.play.disabled = true;
    elements.download.disabled = true;
    elements.record.addEventListener("click", startRecording);
    elements.stop.addEventListener("click", stopRecording);
    elements.play.addEventListener("click", () => elements.audio.play());
    elements.download.addEventListener("click", downloadRecording);
    elements.audio.addEventListener("loadedmetadata", () => {
      elements.play.disabled = false;
      elements.download.disabled = false;
    });
  });
})();
