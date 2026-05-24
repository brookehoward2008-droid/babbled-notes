(function () {
  const elements = {
    record: document.getElementById("record"),
    stop: document.getElementById("record-stop"),
    play: document.getElementById("record-play"),
    loadSeed: document.getElementById("record-load-seed"),
    download: document.getElementById("record-download"),
    audio: document.getElementById("recording-player"),
    status: document.getElementById("record-status"),
    qualitySummary: document.getElementById("record-quality-summary"),
    featureSummary: document.getElementById("record-feature-summary"),
    seedSource: document.getElementById("seed-source"),
    digestPreview: document.getElementById("digest-preview"),
    digestJson: document.getElementById("digest-json"),
    actions: document.querySelector(".recorder-actions"),
    visualCanvas: document.getElementById("record-visualizer"),
    visualTitle: document.getElementById("record-visual-title"),
    visualStatus: document.getElementById("record-visual-status"),
  };

  if (!elements.record || !elements.stop) return;

  let mediaRecorder = null;
  let stream = null;
  let chunks = [];
  let recordingUrl = "";
  let recordingBlob = null;
  let stopTimer = null;
  let visualAudioContext = null;
  let visualAnalyser = null;
  let visualData = null;
  let visualFrame = null;
  let visualParticles = [];
  let visualFlowers = [];
  let visualButterflies = [];
  let visualCreatures = [];
  let visualLevel = 0.04;
  let visualSmoothed = 0.04;
  let visualPhase = 0;
  let visualActive = false;
  let visualWidth = 0;
  let visualHeight = 0;

  function setStatus(text) {
    elements.status.textContent = text;
  }

  function setVisualText(title, status) {
    if (elements.visualTitle) elements.visualTitle.textContent = title;
    if (elements.visualStatus) elements.visualStatus.textContent = status;
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
    updateReceipt(digest);
    setVisualText("Sound became code", "Your recording now has a digest and starter music code.");
    setStatus("Recording ready. Review the quality hint, starter code, or play it back.");
    document.getElementById("record-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      setVisualText("Mic not available", "Neural Bloom needs microphone permission.");
      window.dispatchEvent(new CustomEvent("babbled-recording-denied"));
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
    window.dispatchEvent(new CustomEvent("babbled-recording-start", { detail: { stream } }));
    startRecordVisualizer(stream);
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
    window.dispatchEvent(new CustomEvent("babbled-recording-stop"));
    stopRecordVisualizer("Building sound map", "Your recording is being turned into a digest.");
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
    digest.quality = describeQuality(digest.rms, digest.peak, samples);
    digest.features = describeFeatures(digest.onsets, digest.pitch_trace, buffer.duration);
    await context.close();
    return digest;
  }

  function updateReceipt(digest) {
    const quality = digest.quality || { level: "unknown", silence_ratio: 0, clipped: false };
    const features = digest.features || { pitch_direction: "steady", gesture_density: "sparse" };
    if (elements.qualitySummary) {
      const clipped = quality.clipped ? ", clipped" : "";
      elements.qualitySummary.textContent = `${quality.level.replace("_", " ")}${clipped}; silence ${Math.round((quality.silence_ratio || 0) * 100)}%`;
    }
    if (elements.featureSummary) {
      elements.featureSummary.textContent = `${features.pitch_direction || "steady"} pitch, ${features.gesture_density || "sparse"} gestures`;
    }
    if (elements.seedSource) {
      elements.seedSource.textContent = buildSeedSource(digest);
    }
  }

  function describeQuality(rmsValue, peakValue, samples) {
    const silence = silenceRatio(samples);
    const clipped = peakValue >= 0.985;
    let level = "usable";
    if (rmsValue < 0.008 || silence > 0.92) level = "too_quiet";
    else if (clipped) level = "clipped";
    else if (rmsValue > 0.45) level = "very_loud";
    return {
      level,
      clipped,
      silence_ratio: round(silence, 3),
      dynamic_range: round(Math.max(0, peakValue - rmsValue), 4),
    };
  }

  function describeFeatures(onsets, pitchTrace, duration) {
    return {
      onset_count: onsets.length,
      pitch_count: pitchTrace.length,
      pitch_direction: pitchDirection(pitchTrace),
      gesture_density: gestureDensity(onsets, duration),
    };
  }

  function buildSeedSource(digest) {
    const tempo = digest.estimated_bpm || 80;
    const key = digest.estimated_key || "C major";
    const quality = digest.quality && digest.quality.level ? digest.quality.level : "usable";
    const dynamic = quality === "too_quiet" ? "soft" : quality === "clipped" || quality === "very_loud" ? "loud" : "mf";
    const notes = digest.pitch_trace && digest.pitch_trace.length ? digest.pitch_trace.slice(0, 8) : [];
    const lines = [
      "# starter code from your recording",
      `tempo ${tempo}`,
      `feel ${digest.features && digest.features.gesture_density === "dense" ? "tight" : "straight"}`,
      `key ${key}`,
      "",
      `mood ${quality === "too_quiet" ? "gentle, intimate" : "warm, bright"}`,
      "",
    ];

    if (notes.length) {
      lines.push("voice voice:");
      lines.push(`  ${notes.map((note) => `${note} ! ${dynamic}`).join(" ")}`);
    } else {
      const hits = Math.max(1, Math.min(8, (digest.onsets || []).length || 4));
      lines.push("voice pulse:");
      lines.push(`  ${Array.from({ length: hits }, () => `x ! ${dynamic}`).join(" ")}`);
    }
    return `${lines.join("\n")}\n`;
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

  function silenceRatio(samples) {
    if (!samples.length) return 1;
    let silent = 0;
    for (let i = 0; i < samples.length; i += 1) {
      if (Math.abs(samples[i]) < 0.012) silent += 1;
    }
    return silent / samples.length;
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

  function pitchDirection(notes) {
    const values = notes.map(noteToMidi).filter((value) => value !== null);
    if (values.length < 2) return "steady";
    const delta = values[values.length - 1] - values[0];
    if (delta >= 3) return "rising";
    if (delta <= -3) return "falling";
    if (Math.max(...values) - Math.min(...values) >= 5) return "arched";
    return "steady";
  }

  function gestureDensity(onsets, duration) {
    if (!duration) return "sparse";
    const density = onsets.length / duration;
    if (density >= 5) return "dense";
    if (density >= 2) return "moderate";
    return "sparse";
  }

  function noteToMidi(note) {
    const match = /^([A-G](?:#|b)?)(-?\d)$/.exec(note);
    if (!match) return null;
    const roots = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
    return (Number(match[2]) + 1) * 12 + roots[match[1]];
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
    a.download = `babbled-notes-recording.${ext}`;
    a.click();
  }

  function loadSeedIntoComposer() {
    const composer = document.getElementById("composer-source");
    if (!composer || !elements.seedSource) {
      setStatus("Compose is not available on this page.");
      return;
    }
    const seed = elements.seedSource.textContent || "";
    if (!seed.trim() || seed.includes("will appear after recording")) {
      setStatus("Record a sound first, then load the starter code into Compose.");
      return;
    }
    composer.value = seed;
    composer.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("composer-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setStatus("Loaded starter code into Compose. Choose a style and play it with depth.");
  }

  function setupRecordVisualizer() {
    if (!elements.visualCanvas) return;
    resizeRecordVisualizer();
    window.addEventListener("resize", resizeRecordVisualizer);
    drawRecordVisualizer();
  }

  function resizeRecordVisualizer() {
    if (!elements.visualCanvas) return;
    const rect = elements.visualCanvas.getBoundingClientRect();
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    visualWidth = Math.max(1, rect.width);
    visualHeight = Math.max(1, rect.height);
    elements.visualCanvas.width = Math.floor(visualWidth * ratio);
    elements.visualCanvas.height = Math.floor(visualHeight * ratio);
    const ctx = elements.visualCanvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    seedRecordVisualizer();
  }

  function seedRecordVisualizer() {
    const count = Math.max(22, Math.min(46, Math.floor((visualWidth * visualHeight) / 6800)));
    visualParticles = Array.from({ length: count }, (_, index) => ({
      x: visualWidth * seeded(index, 11),
      y: visualHeight * seeded(index, 23),
      radius: 12 + seeded(index, 37) * 34,
      phase: seeded(index, 41) * Math.PI * 2,
      speed: 0.35 + seeded(index, 53) * 0.8,
      color: index % 4,
    }));
    visualFlowers = Array.from({ length: Math.max(34, Math.floor(visualWidth / 10)) }, (_, index) => ({
      x: visualWidth * seeded(index, 61),
      y: visualHeight * (0.62 + seeded(index, 67) * 0.3),
      size: 2 + seeded(index, 71) * 5,
      sway: seeded(index, 73) * Math.PI * 2,
      color: ["#f9a8d4", "#fde68a", "#ffffff", "#c4b5fd", "#bbf7d0"][index % 5],
    }));
    visualButterflies = Array.from({ length: 9 }, (_, index) => ({
      x: visualWidth * seeded(index, 79),
      y: visualHeight * (0.18 + seeded(index, 83) * 0.42),
      phase: seeded(index, 89) * Math.PI * 2,
      speed: 0.25 + seeded(index, 97) * 0.65,
      color: ["#f97316", "#fde047", "#93c5fd", "#f0abfc"][index % 4],
    }));
    visualCreatures = Array.from({ length: 4 }, (_, index) => ({
      x: visualWidth * (0.14 + seeded(index, 101) * 0.72),
      y: visualHeight * (0.66 + seeded(index, 103) * 0.18),
      type: ["deer", "rabbit", "bird", "squirrel"][index],
      phase: seeded(index, 107) * Math.PI * 2,
      direction: seeded(index, 109) > 0.5 ? 1 : -1,
      scale: 0.62 + seeded(index, 113) * 0.45,
    }));
  }

  function seeded(index, salt) {
    const value = Math.sin(index * 931 + salt * 47) * 10000;
    return value - Math.floor(value);
  }

  function startRecordVisualizer(inputStream) {
    if (!elements.visualCanvas) return;
    stopRecordVisualizer("", "", true);
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      visualAudioContext = new AudioContext();
      const source = visualAudioContext.createMediaStreamSource(inputStream);
      visualAnalyser = visualAudioContext.createAnalyser();
      visualAnalyser.fftSize = 1024;
      visualAnalyser.smoothingTimeConstant = 0.82;
      visualData = new Uint8Array(visualAnalyser.frequencyBinCount);
      source.connect(visualAnalyser);
      visualActive = true;
      setVisualText("Neural Bloom is listening", "The recording will become a digest and starter code.");
    } catch (e) {
      visualActive = true;
      setVisualText("Neural Bloom is listening", "Showing sound-reactive motion while recording.");
    }
  }

  function stopRecordVisualizer(title, status, silent) {
    visualActive = false;
    visualLevel = 0.04;
    visualData = null;
    visualAnalyser = null;
    if (visualAudioContext) {
      try { visualAudioContext.close(); } catch (_) {}
    }
    visualAudioContext = null;
    if (!silent && title && status) setVisualText(title, status);
  }

  function readRecordLevel() {
    if (!visualActive) return 0.035;
    if (!visualAnalyser || !visualData) {
      return 0.1 + Math.sin(visualPhase * 0.8) * 0.04;
    }
    visualAnalyser.getByteFrequencyData(visualData);
    let sum = 0;
    for (let index = 2; index < visualData.length * 0.58; index += 1) {
      sum += visualData[index] / 255;
    }
    return Math.min(1, (sum / (visualData.length * 0.58)) * 2.9);
  }

  function drawRecordVisualizer() {
    if (!elements.visualCanvas) return;
    const ctx = elements.visualCanvas.getContext("2d");
    visualPhase += 0.01;
    visualLevel = readRecordLevel();
    visualSmoothed += (visualLevel - visualSmoothed) * 0.1;

    drawRecordNeuralField(ctx);
    visualFrame = requestAnimationFrame(drawRecordVisualizer);
  }

  function drawRecordNeuralField(ctx) {
    const field = ctx.createLinearGradient(0, 0, 0, visualHeight);
    field.addColorStop(0, "#050816");
    field.addColorStop(0.52, "#0b1026");
    field.addColorStop(1, "#111827");
    ctx.fillStyle = field;
    ctx.fillRect(0, 0, visualWidth, visualHeight);

    drawRecordStars(ctx);
    drawRecordElectricBands(ctx);
    drawRecordSignalBrain(ctx);
  }

  function drawRecordStars(ctx) {
    for (let index = 0; index < 72; index += 1) {
      const x = visualWidth * seeded(index, 211);
      const y = visualHeight * seeded(index, 223);
      const pulse = 0.3 + Math.sin(visualPhase * 2 + index) * 0.22 + visualSmoothed * 0.8;
      ctx.globalAlpha = Math.max(0.12, Math.min(0.92, pulse));
      ctx.fillStyle = index % 6 === 0 ? "#facc15" : "#dbeafe";
      ctx.beginPath();
      ctx.arc(x, y, 0.8 + seeded(index, 227) * 1.7 + visualSmoothed * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawRecordElectricBands(ctx) {
    const count = 9;
    ctx.save();
    ctx.lineWidth = 1 + visualSmoothed * 3;
    ctx.shadowColor = "#60efff";
    ctx.shadowBlur = 14 + visualSmoothed * 28;
    for (let band = 0; band < count; band += 1) {
      const y = visualHeight * (0.18 + band * 0.075);
      const alpha = 0.12 + visualSmoothed * 0.45 + (band % 3) * 0.03;
      ctx.strokeStyle = band % 3 === 0
        ? `rgba(250, 204, 21, ${alpha})`
        : `rgba(96, 239, 255, ${alpha})`;
      ctx.beginPath();
      for (let x = 0; x <= visualWidth; x += 18) {
        const wave = Math.sin(x * 0.018 + visualPhase * (4 + band * 0.2) + band) * (4 + visualSmoothed * 18);
        if (x === 0) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRecordSignalBrain(ctx) {
    const cx = visualWidth * 0.5;
    const cy = visualHeight * 0.5;
    const sx = visualWidth * 0.28;
    const sy = visualHeight * 0.28;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(sx, sy) * 1.6);
    glow.addColorStop(0, `rgba(96, 239, 255, ${0.08 + visualSmoothed * 0.26})`);
    glow.addColorStop(0.45, `rgba(139, 92, 246, ${0.08 + visualSmoothed * 0.18})`);
    glow.addColorStop(1, "rgba(5, 8, 22, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, visualWidth, visualHeight);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sx, sy);
    ctx.strokeStyle = `rgba(191, 219, 254, ${0.42 + visualSmoothed * 0.5})`;
    ctx.lineWidth = 0.012;
    ctx.shadowColor = "#60efff";
    ctx.shadowBlur = 0.08 + visualSmoothed * 0.2;
    ctx.beginPath();
    ctx.moveTo(-0.62, 0.18);
    ctx.bezierCurveTo(-0.82, -0.2, -0.54, -0.68, -0.14, -0.62);
    ctx.bezierCurveTo(0.02, -0.9, 0.48, -0.78, 0.52, -0.48);
    ctx.bezierCurveTo(0.84, -0.42, 0.86, -0.02, 0.64, 0.16);
    ctx.bezierCurveTo(0.78, 0.5, 0.38, 0.72, 0.08, 0.56);
    ctx.bezierCurveTo(-0.18, 0.76, -0.62, 0.58, -0.62, 0.18);
    ctx.stroke();
    ctx.restore();

    for (let index = 0; index < 38; index += 1) {
      const angle = seeded(index, 241) * Math.PI * 2;
      const radius = Math.sqrt(seeded(index, 251));
      const x = cx + Math.cos(angle) * radius * sx * 0.95;
      const y = cy + Math.sin(angle) * radius * sy * 0.8;
      const active = 0.28 + visualSmoothed * 0.72 + Math.sin(visualPhase * 5 + index) * 0.12;
      ctx.fillStyle = index % 5 === 0 ? "#facc15" : index % 3 === 0 ? "#fb7185" : "#60efff";
      ctx.globalAlpha = Math.max(0.16, Math.min(1, active));
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8 + visualSmoothed * 22;
      ctx.beginPath();
      ctx.arc(x, y, 2 + visualSmoothed * 6 + seeded(index, 257) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function drawRecordSky(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, visualHeight);
    sky.addColorStop(0, "#8dc7ef");
    sky.addColorStop(0.42, "#dff4ff");
    sky.addColorStop(1, "#476f38");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, visualWidth, visualHeight);

    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.shadowColor = "rgba(255, 255, 255, 0.55)";
    ctx.shadowBlur = 18 + visualSmoothed * 30;
    ctx.beginPath();
    ctx.arc(visualWidth * 0.78, visualHeight * 0.18, 20 + visualSmoothed * 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawRecordHills(ctx) {
    const layers = [
      { y: 0.46, color: "rgba(219, 234, 254, 0.9)", peaks: [0, 0.14, 0.32, 0.5, 0.68, 0.86, 1.02] },
      { y: 0.54, color: "rgba(49, 86, 58, 0.86)", peaks: [0, 0.18, 0.36, 0.58, 0.78, 1.03] },
    ];
    layers.forEach((layer, layerIndex) => {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(0, visualHeight * layer.y);
      layer.peaks.forEach((point, index) => {
        const peak = visualHeight * (0.08 + ((index + layerIndex) % 3) * 0.04);
        ctx.lineTo(visualWidth * point, visualHeight * layer.y - peak);
        ctx.lineTo(visualWidth * (point + 0.09), visualHeight * layer.y);
      });
      ctx.lineTo(visualWidth, visualHeight);
      ctx.lineTo(0, visualHeight);
      ctx.closePath();
      ctx.fill();
    });
  }

  function drawRecordMeadow(ctx) {
    const meadow = ctx.createLinearGradient(0, visualHeight * 0.46, 0, visualHeight);
    meadow.addColorStop(0, "#83ad53");
    meadow.addColorStop(0.54, "#477832");
    meadow.addColorStop(1, "#173719");
    ctx.fillStyle = meadow;
    ctx.fillRect(0, visualHeight * 0.48, visualWidth, visualHeight * 0.52);

    for (let index = 0; index < 120; index += 1) {
      const x = (index * 73) % visualWidth;
      const y = visualHeight * (0.55 + ((index * 37) % 42) / 100);
      const h = 7 + ((index * 19) % 22);
      const bend = Math.sin(visualPhase * 3 + index) * (1.4 + visualSmoothed * 12);
      ctx.strokeStyle = index % 3 ? "rgba(190, 242, 100, 0.25)" : "rgba(236, 252, 203, 0.22)";
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.quadraticCurveTo(x + bend, y + h * 0.4, x + bend * 1.2, y);
      ctx.stroke();
    }
  }

  function drawRecordBrook(ctx) {
    const activity = visualActive ? 1 + visualSmoothed * 2.8 : 0.7;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(visualWidth * 0.48, visualHeight * 0.48);
    for (let index = 0; index <= 50; index += 1) {
      const p = index / 50;
      const x = visualWidth * (0.5 + Math.sin(p * 8 + visualPhase * 2.6) * (0.03 + p * 0.08));
      const y = visualHeight * (0.5 + p * 0.5);
      const spread = visualWidth * (0.03 + p * 0.1);
      ctx.lineTo(x + spread, y);
    }
    for (let index = 50; index >= 0; index -= 1) {
      const p = index / 50;
      const x = visualWidth * (0.5 + Math.sin(p * 8 + visualPhase * 2.6) * (0.03 + p * 0.08));
      const y = visualHeight * (0.5 + p * 0.5);
      const spread = visualWidth * (0.03 + p * 0.1);
      ctx.lineTo(x - spread, y);
    }
    ctx.closePath();
    const water = ctx.createLinearGradient(0, visualHeight * 0.5, 0, visualHeight);
    water.addColorStop(0, "rgba(186, 230, 253, 0.55)");
    water.addColorStop(1, "rgba(14, 165, 233, 0.78)");
    ctx.fillStyle = water;
    ctx.shadowColor = "rgba(125, 211, 252, 0.62)";
    ctx.shadowBlur = 10 + visualSmoothed * 24;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    for (let ripple = 0; ripple < 6; ripple += 1) {
      ctx.beginPath();
      const y = visualHeight * (0.58 + ripple * 0.055);
      for (let x = visualWidth * 0.38; x < visualWidth * 0.66; x += 12) {
        ctx.lineTo(x, y + Math.sin(x * 0.03 + visualPhase * 8 + ripple) * 2.5 * activity);
      }
      ctx.globalAlpha = 0.18 + visualSmoothed * 0.28;
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawRecordFlowers(ctx) {
    visualFlowers.forEach((flower, index) => {
      const bloom = 0.72 + visualSmoothed * 2.3;
      const sway = Math.sin(visualPhase * 3 + flower.sway) * (1.5 + visualSmoothed * 10);
      const x = flower.x + sway;
      ctx.strokeStyle = "rgba(132, 204, 22, 0.82)";
      ctx.beginPath();
      ctx.moveTo(x, flower.y + flower.size * 2);
      ctx.lineTo(x, flower.y - flower.size * 1.7);
      ctx.stroke();
      ctx.fillStyle = flower.color;
      ctx.globalAlpha = 0.78;
      for (let petal = 0; petal < 5; petal += 1) {
        const angle = (petal / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(
          x + Math.cos(angle) * flower.size * bloom,
          flower.y + Math.sin(angle) * flower.size * bloom,
          flower.size * 0.55 * bloom,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.arc(x, flower.y, flower.size * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function drawRecordButterflies(ctx) {
    visualButterflies.forEach((butterfly, index) => {
      const lift = visualActive ? 0.7 + visualSmoothed * 4 : 0.35;
      butterfly.x += Math.sin(visualPhase + butterfly.phase) * butterfly.speed * lift + 0.18;
      butterfly.y += Math.cos(visualPhase * 1.7 + butterfly.phase) * butterfly.speed * lift;
      if (butterfly.x > visualWidth + 24) butterfly.x = -24;
      if (butterfly.y < visualHeight * 0.12) butterfly.y = visualHeight * 0.12;
      if (butterfly.y > visualHeight * 0.62) butterfly.y = visualHeight * 0.62;
      const wing = Math.sin(visualPhase * 16 + index) * 3;
      ctx.fillStyle = butterfly.color;
      ctx.globalAlpha = 0.78;
      ctx.beginPath();
      ctx.ellipse(butterfly.x - 3, butterfly.y, 3.5 + wing * 0.2, 6, -0.6, 0, Math.PI * 2);
      ctx.ellipse(butterfly.x + 3, butterfly.y, 3.5 - wing * 0.2, 6, 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function drawRecordCreatures(ctx) {
    visualCreatures.forEach((creature, index) => {
      const active = visualActive ? 0.2 + visualSmoothed * 1.8 : 0.08;
      creature.x += Math.sin(visualPhase + creature.phase) * active * creature.direction;
      creature.y += Math.cos(visualPhase * 1.3 + creature.phase) * active * 0.2;
      if (creature.x < 24 || creature.x > visualWidth - 24) creature.direction *= -1;
      ctx.save();
      ctx.translate(creature.x, creature.y);
      ctx.scale(creature.direction * creature.scale, creature.scale);
      ctx.globalAlpha = 0.9;
      if (creature.type === "deer") {
        ctx.fillStyle = "#9a693d";
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2);
        ctx.ellipse(17, -8, 7, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#5b371f";
        ctx.lineWidth = 1.4;
        [-9, -2, 7, 14].forEach((leg) => {
          ctx.beginPath();
          ctx.moveTo(leg, 7);
          ctx.lineTo(leg + Math.sin(visualPhase * 5 + index) * 2, 18);
          ctx.stroke();
        });
      } else if (creature.type === "rabbit") {
        ctx.fillStyle = "#c4aa84";
        ctx.beginPath();
        ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2);
        ctx.ellipse(10, -6, 6, 5, 0, 0, Math.PI * 2);
        ctx.ellipse(9, -15, 2.2, 7, 0.2, 0, Math.PI * 2);
        ctx.ellipse(14, -14, 2.2, 7, -0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (creature.type === "squirrel") {
        ctx.fillStyle = "#a16207";
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 6, 0, 0, Math.PI * 2);
        ctx.arc(-9, -7, 8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#60a5fa";
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2);
        ctx.moveTo(6, 0);
        ctx.lineTo(13, -2);
        ctx.lineTo(13, 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawRecordGlow(ctx) {
    const radius = Math.max(visualWidth, visualHeight) * 0.7;
    const gradient = ctx.createRadialGradient(visualWidth * 0.48, visualHeight * 0.5, 0, visualWidth * 0.48, visualHeight * 0.5, radius);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.04 + visualSmoothed * 0.16})`);
    gradient.addColorStop(0.45, "rgba(255, 255, 255, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.34)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, visualWidth, visualHeight);
  }

  function drawRecordBloom(ctx) {
    const radius = Math.min(visualWidth, visualHeight) * (0.24 + visualSmoothed * 0.5);
    const gradient = ctx.createRadialGradient(visualWidth / 2, visualHeight / 2, 0, visualWidth / 2, visualHeight / 2, radius);
    gradient.addColorStop(0, `rgba(241, 238, 231, ${0.04 + visualSmoothed * 0.2})`);
    gradient.addColorStop(0.45, `rgba(99, 199, 188, ${0.05 + visualSmoothed * 0.18})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(visualWidth / 2, visualHeight / 2, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function hexToRgba(hex, alpha) {
    const value = hex.replace("#", "");
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupRecordVisualizer();
    elements.stop.disabled = true;
    elements.play.disabled = true;
    if (elements.loadSeed) elements.loadSeed.disabled = true;
    elements.download.disabled = true;
    elements.record.addEventListener("click", startRecording);
    elements.stop.addEventListener("click", stopRecording);
    elements.play.addEventListener("click", () => elements.audio.play());
    if (elements.loadSeed) elements.loadSeed.addEventListener("click", loadSeedIntoComposer);
    elements.download.addEventListener("click", downloadRecording);
    elements.audio.addEventListener("loadedmetadata", () => {
      elements.play.disabled = false;
      if (elements.loadSeed) elements.loadSeed.disabled = false;
      elements.download.disabled = false;
    });
  });
})();
