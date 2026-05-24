(function () {
  const canvas = document.getElementById("meadow-world");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const elements = {
    record: document.getElementById("world-record"),
    label: document.getElementById("world-record-label"),
    waveform: document.getElementById("world-waveform"),
    activity: document.getElementById("world-activity"),
    activityBar: document.getElementById("world-activity-bar"),
    activityState: document.getElementById("world-activity-state"),
    voiceMeter: document.getElementById("world-voice-meter"),
    voiceLevel: document.getElementById("voice-level"),
    noteCount: document.getElementById("world-note-count"),
    messageTitle: document.getElementById("world-heading"),
    messageText: document.getElementById("world-message-text"),
    sliders: {
      reaction: document.getElementById("life-intensity"),
      variety: document.getElementById("animal-activity"),
      resonance: document.getElementById("plant-growth"),
    },
    values: {
      reaction: document.getElementById("life-value"),
      variety: document.getElementById("animal-value"),
      resonance: document.getElementById("plant-value"),
    },
    states: {
      brain: document.getElementById("bird-state"),
      signal: document.getElementById("wire-state"),
      melody: document.getElementById("melody-state"),
      listening: document.getElementById("listening-state"),
    },
    modeButtons: document.querySelectorAll("[data-wire-mode]"),
  };

  let width = 0;
  let height = 0;
  let ratio = 1;
  let listening = false;
  let audioContext = null;
  let analyser = null;
  let frequencyData = null;
  let voiceLevel = 0;
  let smoothLevel = 0;
  let sounds = 0;
  let lastSoundBeat = -1;
  let time = 0;
  let stars = [];
  let neuralNodes = [];
  let frequencyBands = { low: 0, mid: 0, high: 0 };

  function init() {
    seedWaveform();
    bind();
    resize();
    requestAnimationFrame(draw);
  }

  function seedWaveform() {
    if (!elements.waveform) return;
    elements.waveform.replaceChildren();
    for (let index = 0; index < 28; index += 1) {
      const bar = document.createElement("span");
      bar.style.setProperty("--i", index);
      bar.style.setProperty("--h", `${0.28 + (index % 7) * 0.14}rem`);
      elements.waveform.appendChild(bar);
    }
  }

  function bind() {
    window.addEventListener("resize", resize);
    if (elements.record) {
      elements.record.addEventListener("click", () => {
        const classic = listening
          ? document.getElementById("record-stop")
          : document.getElementById("record");
        if (classic) classic.click();
      });
    }

    Object.keys(elements.sliders).forEach((key) => {
      const input = elements.sliders[key];
      if (!input) return;
      input.addEventListener("input", () => updateSliderValue(key));
      updateSliderValue(key);
    });

    elements.modeButtons.forEach((button) => {
      button.addEventListener("click", () => setMode(button.dataset.wireMode || "balanced"));
    });

    window.addEventListener("babbled-recording-start", (event) => {
      startListening(event.detail && event.detail.stream);
    });
    window.addEventListener("babbled-recording-stop", stopListening);
    window.addEventListener("babbled-recording-denied", () => {
      setText(elements.messageTitle, "Microphone permission is needed");
      setText(elements.messageText, "Allow the mic, then try Record one sound again.");
      setText(elements.activityState, "Mic blocked");
    });
  }

  function updateSliderValue(key) {
    const input = elements.sliders[key];
    const value = elements.values[key];
    if (input && value) value.textContent = `${input.value}%`;
  }

  function slider(key, fallback) {
    const input = elements.sliders[key];
    return input ? Number(input.value) / 100 : fallback;
  }

  function setMode(mode) {
    const presets = {
      calm: { reaction: 42, variety: 38, resonance: 44 },
      balanced: { reaction: 70, variety: 65, resonance: 58 },
      bright: { reaction: 92, variety: 88, resonance: 82 },
    };
    const next = presets[mode] || presets.balanced;
    Object.entries(next).forEach(([key, value]) => {
      const input = elements.sliders[key];
      if (input) input.value = value;
      updateSliderValue(key);
    });
    elements.modeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.wireMode === mode ? "true" : "false");
    });
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    ratio = Math.max(1, window.devicePixelRatio || 1);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    seedSpace();
    seedNeuralNodes();
  }

  function seedSpace() {
    const count = Math.max(42, Math.min(110, Math.round((width * height) / 5200)));
    stars = Array.from({ length: count }, (_, index) => ({
      x: width * seeded(index, 17),
      y: height * seeded(index, 29),
      r: 0.6 + seeded(index, 31) * 1.8,
      phase: seeded(index, 37) * Math.PI * 2,
    }));
  }

  function seedNeuralNodes() {
    const count = Math.max(38, Math.min(72, Math.round(width / 10)));
    neuralNodes = Array.from({ length: count }, (_, index) => {
      const angle = seeded(index, 43) * Math.PI * 2;
      const radius = Math.sqrt(seeded(index, 47));
      const point = brainPoint(angle, radius);
      return {
        x: point.x,
        y: point.y,
        angle,
        radius,
        pulse: 0,
        phase: seeded(index, 53) * Math.PI * 2,
        hue: ["#00f5ff", "#8b5cf6", "#ffdf20", "#ff3d81", "#39ff88"][index % 5],
      };
    });
  }

  function startListening(stream) {
    listening = true;
    setText(elements.label, "Listening...");
    setText(elements.messageTitle, "Neural Bloom is growing");
    setText(elements.messageText, "Keep making sound. Rhythm sparks; longer tones grow electric paths.");
    setText(elements.activityState, "Listening");
    setText(elements.states.listening, "On");
    addClass(elements.record, "is-active", true);
    addClass(elements.waveform, "is-active", true);

    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.82;
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
    } catch (_) {
      analyser = null;
      frequencyData = null;
    }
  }

  function stopListening() {
    listening = false;
    setText(elements.label, "Record one sound");
    setText(elements.messageTitle, "Start with one sound");
    setText(elements.messageText, "Tap Record one sound, hum or tap, then watch Neural Bloom light up.");
    setText(elements.activityState, "Waiting for sound");
    setText(elements.states.listening, "Off");
    addClass(elements.record, "is-active", false);
    addClass(elements.waveform, "is-active", false);
    analyser = null;
    frequencyData = null;
    if (audioContext) {
      try { audioContext.close(); } catch (_) {}
    }
    audioContext = null;
  }

  function readVoiceLevel() {
    if (!listening) {
      frequencyBands.low += (0.03 - frequencyBands.low) * 0.06;
      frequencyBands.mid += (0.04 - frequencyBands.mid) * 0.06;
      frequencyBands.high += (0.02 - frequencyBands.high) * 0.06;
      return 5 + Math.sin(time * 1.4) * 2;
    }
    if (!analyser || !frequencyData) {
      frequencyBands.low = 0.22 + Math.sin(time * 1.8) * 0.08;
      frequencyBands.mid = 0.18 + Math.sin(time * 2.7) * 0.08;
      frequencyBands.high = 0.16 + Math.sin(time * 4.1) * 0.08;
      return 38 + Math.sin(time * 4) * 22;
    }

    analyser.getByteFrequencyData(frequencyData);
    let sum = 0;
    const end = Math.floor(frequencyData.length * 0.62);
    for (let index = 2; index < end; index += 1) {
      sum += frequencyData[index] / 255;
    }
    frequencyBands.low += (bandAverage(2, 18) - frequencyBands.low) * 0.16;
    frequencyBands.mid += (bandAverage(18, 76) - frequencyBands.mid) * 0.16;
    frequencyBands.high += (bandAverage(76, 190) - frequencyBands.high) * 0.16;
    return clamp((sum / Math.max(1, end - 2)) * 265, 0, 100);
  }

  function bandAverage(start, end) {
    if (!frequencyData) return 0;
    const safeEnd = Math.min(frequencyData.length, end);
    let sum = 0;
    for (let index = start; index < safeEnd; index += 1) {
      sum += frequencyData[index] / 255;
    }
    return sum / Math.max(1, safeEnd - start);
  }

  function draw() {
    time += 0.012;
    const reaction = slider("reaction", 0.7);
    const variety = slider("variety", 0.65);
    const resonance = slider("resonance", 0.58);

    voiceLevel += (readVoiceLevel() - voiceLevel) * 0.1;
    smoothLevel += (voiceLevel / 100 - smoothLevel) * 0.09;

    const beat = Math.floor(time * (1.5 + reaction * 5.2));
    if (listening && voiceLevel > 24 && beat !== lastSoundBeat) {
      sounds += 1;
      lastSoundBeat = beat;
      neuralNodes.forEach((node, index) => {
        const active = (index + sounds) % Math.max(2, Math.round(6 - variety * 3)) === 0;
        if (active) node.pulse = 1;
      });
    }

    drawSpace();
    drawNeuralBloom(reaction, variety, resonance);
    updateUi();

    requestAnimationFrame(draw);
  }

  function drawSpace() {
    const space = ctx.createLinearGradient(0, 0, 0, height);
    space.addColorStop(0, "#020617");
    space.addColorStop(0.42, "#07113a");
    space.addColorStop(1, "#16052e");
    ctx.fillStyle = space;
    ctx.fillRect(0, 0, width, height);

    stars.forEach((star, index) => {
      const twinkle = 0.3 + Math.sin(time * (0.8 + star.r) + star.phase) * 0.22;
      ctx.globalAlpha = clamp(twinkle + smoothLevel * 0.8, 0.15, 0.95);
      ctx.fillStyle = index % 5 === 0 ? "#ffdf20" : index % 3 === 0 ? "#00f5ff" : "#dbeafe";
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r + smoothLevel * 1.8, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    const nebula = ctx.createRadialGradient(
      width * 0.52,
      height * 0.5,
      0,
      width * 0.52,
      height * 0.5,
      Math.max(width, height) * 0.58,
    );
    nebula.addColorStop(0, `rgba(0, 245, 255, ${0.12 + smoothLevel * 0.3})`);
    nebula.addColorStop(0.34, `rgba(255, 61, 129, ${0.08 + smoothLevel * 0.18})`);
    nebula.addColorStop(0.58, `rgba(139, 92, 246, ${0.07 + smoothLevel * 0.2})`);
    nebula.addColorStop(1, "rgba(5, 8, 22, 0)");
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, width, height);
  }

  function drawNeuralBloom(reaction, variety, resonance) {
    const growth = clamp(0.1 + smoothLevel * 1.22 + resonance * 0.14, 0.12, 1);
    const centerX = width * 0.52;
    const centerY = height * 0.55;
    const scale = Math.min(width * 0.52, height * 0.56);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    drawBrainDepthMesh(growth);
    drawBrainShell(growth);
    ctx.restore();

    drawOrbitRings(growth, resonance);
    drawElectricPathways(growth, reaction, variety);
    drawFrequencyBloom(growth);
    drawSpatialGlow(growth, resonance);
    drawBloomNodes(growth, reaction);
    drawBrainCoreGlow(growth);
  }

  function drawBrainShell(growth) {
    const shell = ctx.createRadialGradient(0, -0.05, 0.08, 0, 0.05, 1.05);
    shell.addColorStop(0, `rgba(255, 61, 129, ${0.06 + growth * 0.12})`);
    shell.addColorStop(0.38, `rgba(0, 245, 255, ${0.05 + growth * 0.12})`);
    shell.addColorStop(0.76, `rgba(139, 92, 246, ${0.04 + growth * 0.06})`);
    shell.addColorStop(1, "rgba(139, 92, 246, 0.015)");

    ctx.fillStyle = shell;
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 0.08 + growth * 0.2;
    brainOutlinePath();
    ctx.fill();

    ctx.lineWidth = 0.01;
    ctx.strokeStyle = `rgba(219, 244, 255, ${0.68 + growth * 0.28})`;
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 0.05 + growth * 0.16;
    brainOutlinePath();
    ctx.stroke();

    ctx.lineWidth = 0.005;
    ctx.strokeStyle = `rgba(255, 223, 32, ${0.38 + growth * 0.44})`;
    ctx.shadowColor = "#ffdf20";
    ctx.shadowBlur = 0.03 + growth * 0.1;
    ctx.beginPath();
    ctx.moveTo(0.02, -0.76);
    ctx.bezierCurveTo(-0.04, -0.5, -0.03, -0.22, 0.0, 0.04);
    ctx.bezierCurveTo(0.03, 0.28, 0.0, 0.48, -0.08, 0.68);
    ctx.stroke();

    drawBrainFolds(growth);
    drawBrainStem(growth);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function drawBrainDepthMesh(growth) {
    ctx.save();
    ctx.globalAlpha = 0.18 + growth * 0.26;
    ctx.lineWidth = 0.004;
    ctx.strokeStyle = "#8b5cf6";
    ctx.shadowColor = "#8b5cf6";
    ctx.shadowBlur = 0.025 + growth * 0.06;
    for (let index = 0; index < 9; index += 1) {
      const offset = -0.44 + index * 0.11;
      const wobble = Math.sin(time * 1.4 + index) * 0.018;
      ctx.beginPath();
      ctx.moveTo(-0.7 + Math.abs(offset) * 0.25, offset + wobble);
      ctx.bezierCurveTo(-0.36, offset - 0.1, 0.22, offset + 0.1, 0.74 - Math.abs(offset) * 0.2, offset - wobble);
      ctx.stroke();
    }
    for (let index = 0; index < 7; index += 1) {
      const offset = -0.5 + index * 0.16;
      ctx.beginPath();
      ctx.moveTo(offset, -0.58 + Math.abs(offset) * 0.12);
      ctx.bezierCurveTo(offset + 0.1, -0.18, offset - 0.08, 0.2, offset + 0.03, 0.58);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawOrbitRings(growth, resonance) {
    const centerX = width * 0.52;
    const centerY = height * 0.55;
    const base = Math.min(width, height) * (0.32 + growth * 0.11);
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(Math.sin(time * 0.28) * 0.05);
    for (let index = 0; index < 3; index += 1) {
      const alpha = 0.08 + growth * 0.08 + index * 0.025;
      ctx.strokeStyle = index === 1
        ? `rgba(255, 61, 129, ${alpha})`
        : `rgba(0, 245, 255, ${alpha})`;
      ctx.lineWidth = 1 + index * 0.45 + smoothLevel * 1.6;
      ctx.shadowColor = index === 1 ? "#ff3d81" : "#00f5ff";
      ctx.shadowBlur = 10 + resonance * 18;
      ctx.beginPath();
      ctx.ellipse(0, 0, base * (1 + index * 0.12), base * (0.38 + index * 0.04), -0.18 + index * 0.22, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function brainOutlinePath() {
    ctx.beginPath();
    ctx.moveTo(-0.86, 0.0);
    ctx.bezierCurveTo(-0.94, -0.24, -0.78, -0.48, -0.52, -0.55);
    ctx.bezierCurveTo(-0.48, -0.78, -0.18, -0.92, 0.04, -0.78);
    ctx.bezierCurveTo(0.22, -0.98, 0.56, -0.86, 0.64, -0.58);
    ctx.bezierCurveTo(0.86, -0.52, 0.98, -0.32, 0.9, -0.12);
    ctx.bezierCurveTo(1.02, 0.04, 0.96, 0.28, 0.76, 0.38);
    ctx.bezierCurveTo(0.74, 0.62, 0.46, 0.76, 0.2, 0.65);
    ctx.bezierCurveTo(0.03, 0.78, -0.24, 0.72, -0.36, 0.52);
    ctx.bezierCurveTo(-0.6, 0.54, -0.78, 0.42, -0.76, 0.24);
    ctx.bezierCurveTo(-0.92, 0.2, -0.98, 0.1, -0.86, 0.0);
    ctx.closePath();
  }

  function drawBrainFolds(growth) {
    const alpha = 0.28 + growth * 0.34;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 0.005;
    ctx.strokeStyle = "#00f5ff";
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 0.018 + growth * 0.05;

    const folds = [
      [[-0.72, -0.3], [-0.5, -0.48], [-0.25, -0.42], [-0.08, -0.61]],
      [[-0.78, -0.08], [-0.56, -0.24], [-0.27, -0.12], [-0.02, -0.34]],
      [[-0.74, 0.12], [-0.5, -0.02], [-0.24, 0.13], [0.02, -0.08]],
      [[-0.62, 0.34], [-0.34, 0.18], [-0.12, 0.38], [0.1, 0.18]],
      [[0.05, -0.62], [0.28, -0.42], [0.45, -0.58], [0.68, -0.34]],
      [[0.03, -0.38], [0.32, -0.22], [0.54, -0.34], [0.78, -0.1]],
      [[0.04, -0.12], [0.32, 0.04], [0.58, -0.08], [0.79, 0.14]],
      [[0.0, 0.16], [0.28, 0.32], [0.5, 0.2], [0.68, 0.42]],
      [[-0.14, 0.46], [0.08, 0.58], [0.34, 0.48], [0.5, 0.62]],
      [[-0.5, -0.48], [-0.38, -0.2], [-0.4, 0.12], [-0.26, 0.42]],
      [[0.28, -0.7], [0.18, -0.38], [0.24, -0.04], [0.12, 0.32]],
    ];

    folds.forEach((fold, index) => {
      ctx.strokeStyle = index % 3 === 0 ? "#ff3d81" : index % 2 === 0 ? "#00f5ff" : "#8b5cf6";
      ctx.beginPath();
      ctx.moveTo(fold[0][0], fold[0][1]);
      ctx.bezierCurveTo(fold[1][0], fold[1][1], fold[2][0], fold[2][1], fold[3][0], fold[3][1]);
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
  }

  function drawBrainStem(growth) {
    ctx.save();
    ctx.globalAlpha = 0.34 + growth * 0.42;
    ctx.lineWidth = 0.018;
    ctx.strokeStyle = "#00f5ff";
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 0.05 + growth * 0.12;
    ctx.beginPath();
    ctx.moveTo(-0.08, 0.56);
    ctx.bezierCurveTo(-0.02, 0.72, 0.03, 0.88, 0.0, 1.05);
    ctx.stroke();
    ctx.lineWidth = 0.009;
    ctx.strokeStyle = "#ff3d81";
    ctx.beginPath();
    ctx.moveTo(0.03, 0.52);
    ctx.bezierCurveTo(0.16, 0.68, 0.24, 0.78, 0.36, 0.86);
    ctx.stroke();
    ctx.restore();
  }

  function drawElectricPathways(growth, reaction, variety) {
    const activeNodes = neuralNodes.filter((node) => node.radius <= growth);
    const maxLinks = Math.min(activeNodes.length - 1, Math.round(18 + variety * 34));
    const motifStrength = clamp((sounds % 12) / 12 + smoothLevel * 0.45, 0, 1);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (let index = 0; index < maxLinks; index += 1) {
      const from = activeNodes[index % activeNodes.length];
      const to = activeNodes[(index * 7 + sounds + 5) % activeNodes.length];
      if (!from || !to) continue;

      const spark = 0.28 + Math.sin(time * (3 + reaction * 7) + index) * 0.16;
      ctx.strokeStyle = index % 3 === 0
        ? `rgba(255, 223, 32, ${0.34 + spark})`
        : index % 3 === 1
          ? `rgba(255, 61, 129, ${0.26 + spark})`
          : `rgba(0, 245, 255, ${0.28 + spark})`;
      ctx.lineWidth = 1.2 + smoothLevel * 3.4 + (index % 6 === 0 ? motifStrength * 2.9 : 0);
      ctx.shadowColor = index % 3 === 0 ? "#ffdf20" : index % 3 === 1 ? "#ff3d81" : "#00f5ff";
      ctx.shadowBlur = 12 + smoothLevel * 32 + (index % 6 === 0 ? motifStrength * 22 : 0);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      const midX = (from.x + to.x) / 2 + Math.sin(time * 2 + index) * width * 0.025;
      const midY = (from.y + to.y) / 2 + Math.cos(time * 2.4 + index) * height * 0.025;
      ctx.quadraticCurveTo(midX, midY, to.x, to.y);
      ctx.stroke();

      if (index % 5 === 0) {
        const head = (time * (0.35 + reaction * 0.55) + index * 0.11) % 1;
        const hx = from.x + (to.x - from.x) * head;
        const hy = from.y + (to.y - from.y) * head;
        ctx.fillStyle = index % 2 ? "#ffdf20" : "#ffffff";
        ctx.shadowBlur = 18 + smoothLevel * 20;
        ctx.beginPath();
        ctx.arc(hx, hy, 2.2 + smoothLevel * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.shadowBlur = 0;
  }

  function drawFrequencyBloom(growth) {
    const centerX = width * 0.52;
    const centerY = height * 0.5;
    const lowY = centerY + height * 0.18;
    const midY = centerY;
    const highY = centerY - height * 0.2;
    const bands = [
      { value: frequencyBands.low, y: lowY, color: "#ffdf20", label: "low" },
      { value: frequencyBands.mid, y: midY, color: "#00f5ff", label: "mid" },
      { value: frequencyBands.high, y: highY, color: "#ff3d81", label: "high" },
    ];

    bands.forEach((band, index) => {
      const strength = clamp((listening ? band.value : smoothLevel * 0.25) + growth * 0.18, 0, 1);
      const radius = width * (0.035 + strength * 0.12);
      const x = centerX + (index - 1) * width * 0.085 + Math.sin(time * 2 + index) * 8;
      const glow = ctx.createRadialGradient(x, band.y, 0, x, band.y, radius);
      glow.addColorStop(0, colorToRgba(band.color, 0.2 + strength * 0.35));
      glow.addColorStop(0.65, colorToRgba(band.color, 0.06 + strength * 0.18));
      glow.addColorStop(1, colorToRgba(band.color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, band.y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (band.label === "high" && strength > 0.26) {
        drawSparkColumn(x, band.y, band.color, strength);
      }
    });
  }

  function drawSpatialGlow(growth, resonance) {
    const spread = clamp(resonance * 0.7 + frequencyBands.high * 0.35 + smoothLevel * 0.35, 0.08, 1);
    const left = ctx.createRadialGradient(
      width * (0.5 - spread * 0.18),
      height * 0.5,
      0,
      width * (0.5 - spread * 0.18),
      height * 0.5,
      width * (0.14 + spread * 0.18),
    );
    left.addColorStop(0, `rgba(0, 245, 255, ${0.06 + growth * 0.15})`);
    left.addColorStop(1, "rgba(0, 245, 255, 0)");
    ctx.fillStyle = left;
    ctx.fillRect(0, 0, width, height);

    const right = ctx.createRadialGradient(
      width * (0.54 + spread * 0.18),
      height * 0.5,
      0,
      width * (0.54 + spread * 0.18),
      height * 0.5,
      width * (0.14 + spread * 0.18),
    );
    right.addColorStop(0, `rgba(255, 61, 129, ${0.05 + growth * 0.14})`);
    right.addColorStop(1, "rgba(139, 92, 246, 0)");
    ctx.fillStyle = right;
    ctx.fillRect(0, 0, width, height);
  }

  function drawBloomNodes(growth, reaction) {
    neuralNodes.forEach((node, index) => {
      node.pulse *= 0.92;
      const active = node.radius <= growth;
      const wave = Math.sin(time * (2 + reaction * 5) + node.phase) * 0.5 + 0.5;
      const size = active ? 2.2 + wave * 2.8 + node.pulse * 7 : 1.2;
      const alpha = active ? 0.36 + smoothLevel * 0.62 + node.pulse * 0.5 : 0.08;

      ctx.globalAlpha = clamp(alpha, 0.05, 1);
      ctx.fillStyle = node.hue;
      ctx.shadowColor = node.hue;
      ctx.shadowBlur = active ? 8 + smoothLevel * 24 + node.pulse * 18 : 0;
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
      ctx.fill();

      if (active && index % 5 === 0) {
        ctx.globalAlpha = 0.14 + smoothLevel * 0.28;
        ctx.strokeStyle = node.hue;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(node.x, node.y, size * (3.6 + smoothLevel * 3), 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function drawBrainCoreGlow(growth) {
    const pulse = 0.75 + Math.sin(time * 4.2) * 0.14 + smoothLevel * 0.5;
    const radius = Math.min(width, height) * (0.1 + growth * 0.28) * pulse;
    const glow = ctx.createRadialGradient(width * 0.52, height * 0.56, 0, width * 0.52, height * 0.56, radius);
    glow.addColorStop(0, `rgba(255, 223, 32, ${0.1 + growth * 0.28})`);
    glow.addColorStop(0.35, `rgba(255, 61, 129, ${0.08 + smoothLevel * 0.24})`);
    glow.addColorStop(0.58, `rgba(0, 245, 255, ${0.1 + smoothLevel * 0.28})`);
    glow.addColorStop(1, "rgba(0, 245, 255, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(width * 0.52, height * 0.56, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSparkColumn(x, y, color, strength) {
    ctx.save();
    ctx.strokeStyle = colorToRgba(color, 0.35 + strength * 0.4);
    ctx.lineWidth = 1;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 + strength * 18;
    for (let index = 0; index < 8; index += 1) {
      const offset = (index - 4) * 8;
      const rise = (time * 70 + index * 19) % (height * 0.28);
      ctx.beginPath();
      ctx.moveTo(x + offset, y - rise);
      ctx.lineTo(x + offset + Math.sin(time + index) * 9, y - rise - 12 * strength);
      ctx.stroke();
    }
    ctx.restore();
  }

  function brainPoint(angle, radius) {
    const centerX = width * 0.52;
    const centerY = height * 0.55;
    const scaleX = width * 0.43;
    const scaleY = height * 0.45;
    const lobe = brainRadius(angle);
    return {
      x: centerX + Math.cos(angle) * radius * scaleX * lobe,
      y: centerY + Math.sin(angle) * radius * scaleY * lobe * (0.82 + Math.cos(angle) * 0.08),
    };
  }

  function brainRadius(angle) {
    return 0.84
      + Math.sin(angle * 2.0 - 0.7) * 0.09
      + Math.sin(angle * 3.2 + 0.8) * 0.08
      + Math.cos(angle * 5.3 - 0.4) * 0.06;
  }

  function updateUi() {
    const level = Math.round(clamp(voiceLevel, 0, 100));
    const activity = Math.round(clamp(level * 0.78 + slider("reaction", 0.7) * 22, 0, 100));
    setText(elements.activity, `${activity}%`);
    setText(elements.voiceLevel, `${level}%`);
    setText(elements.noteCount, `${sounds} ${sounds === 1 ? "sound" : "sounds"}`);
    setText(elements.states.brain, level > 28 ? "Blooming" : "Empty");
    setText(elements.states.signal, level > 28 ? "Electric" : "Still");
    setText(elements.states.melody, sounds > 0 ? "Growing" : "Waiting");
    if (elements.activityBar) elements.activityBar.style.width = `${activity}%`;
    if (elements.voiceMeter) elements.voiceMeter.style.width = `${level}%`;

    document.querySelectorAll(".wire-strip div").forEach((card, index) => {
      const threshold = 16 + index * 18;
      card.classList.toggle("is-awake", activity > threshold);
    });
  }

  function seeded(index, salt) {
    const x = Math.sin(index * 999 + salt * 77) * 10000;
    return x - Math.floor(x);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  function addClass(node, className, enabled) {
    if (node) node.classList.toggle(className, enabled);
  }

  function colorToRgba(hex, alpha) {
    const value = hex.replace("#", "");
    const red = parseInt(value.slice(0, 2), 16);
    const green = parseInt(value.slice(2, 4), 16);
    const blue = parseInt(value.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  init();
}());
