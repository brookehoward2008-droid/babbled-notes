(function () {
  const canvas = document.getElementById("fluid-canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const elements = {
    listen: document.getElementById("listen-toggle"),
    status: document.getElementById("listen-status"),
    state: document.querySelector(".listening-state"),
    mic: document.getElementById("mic-toggle"),
    sensitivity: document.getElementById("sensitivity"),
    intensity: document.getElementById("intensity"),
    glow: document.getElementById("glow"),
    trail: document.getElementById("trail"),
    mood: document.getElementById("mood"),
  };

  const palettes = {
    violet: ["#bcb8ff", "#7f5cff", "#8ce8ff", "#f4f7ff"],
    cyan: ["#8ce8ff", "#4aa8ff", "#e8fbff", "#8d7cff"],
    silver: ["#f4f7ff", "#b7c4d8", "#8ce8ff", "#d9d5ff"],
    lavender: ["#d8caff", "#b58cff", "#f4f0ff", "#7fdcff"],
  };

  let width = 0;
  let height = 0;
  let ratio = 1;
  let particles = [];
  let audioContext = null;
  let analyser = null;
  let micStream = null;
  let frequencyData = null;
  let listening = false;
  let level = 0;
  let smoothedLevel = 0.08;
  let phase = 0;

  function resize() {
    ratio = Math.max(1, window.devicePixelRatio || 1);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    seedParticles();
  }

  function seedParticles() {
    const count = Math.max(46, Math.min(96, Math.floor((width * height) / 15000)));
    particles = Array.from({ length: count }, (_, i) => ({
      x: width * (0.08 + 0.84 * seeded(i, 13)),
      y: height * (0.08 + 0.84 * seeded(i, 29)),
      r: 16 + seeded(i, 47) * 38,
      a: 0.08 + seeded(i, 71) * 0.22,
      drift: seeded(i, 97) * Math.PI * 2,
      speed: 0.2 + seeded(i, 111) * 0.7,
      color: i % 4,
    }));
  }

  function seeded(i, salt) {
    const x = Math.sin(i * 999 + salt * 31) * 10000;
    return x - Math.floor(x);
  }

  async function toggleListening() {
    if (listening) {
      stopListening();
      return;
    }
    if (!elements.mic.checked) {
      listening = true;
      setListeningState("Listening to ambient motion...");
      return;
    }
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const source = audioContext.createMediaStreamSource(micStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.84;
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
      listening = true;
      setListeningState("Listening...");
    } catch (_) {
      listening = true;
      setListeningState("Mic unavailable. Showing touchless motion.");
    }
  }

  function stopListening() {
    listening = false;
    level = 0;
    elements.listen.textContent = "Start Listening";
    elements.state.classList.remove("is-listening");
    elements.status.textContent = "Idle";
    if (micStream) micStream.getTracks().forEach((track) => track.stop());
    micStream = null;
    analyser = null;
    frequencyData = null;
    if (audioContext) audioContext.close();
    audioContext = null;
  }

  function setListeningState(text) {
    elements.listen.textContent = "Stop Listening";
    elements.state.classList.add("is-listening");
    elements.status.textContent = text;
  }

  function readAudioLevel() {
    if (!listening) return 0.045;
    if (!analyser || !frequencyData) {
      return 0.12 + Math.sin(phase * 0.9) * 0.045;
    }
    analyser.getByteFrequencyData(frequencyData);
    let sum = 0;
    for (let i = 2; i < frequencyData.length * 0.62; i += 1) {
      sum += frequencyData[i] / 255;
    }
    return Math.min(1, (sum / (frequencyData.length * 0.62)) * Number(elements.sensitivity.value));
  }

  function draw() {
    phase += 0.008;
    level = readAudioLevel();
    smoothedLevel += (level - smoothedLevel) * 0.09;

    const trail = Number(elements.trail.value);
    ctx.fillStyle = `rgba(5, 6, 10, ${trail})`;
    ctx.fillRect(0, 0, width, height);

    drawGlass();
    drawFluid();
    drawCenterBloom();
    requestAnimationFrame(draw);
  }

  function drawGlass() {
    const grd = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height));
    grd.addColorStop(0, "rgba(28, 32, 50, 0.12)");
    grd.addColorStop(0.55, "rgba(5, 6, 10, 0.12)");
    grd.addColorStop(1, "rgba(0, 0, 0, 0.44)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);
  }

  function drawFluid() {
    const palette = palettes[elements.mood.value] || palettes.violet;
    const intensity = Number(elements.intensity.value);
    const glow = Number(elements.glow.value);
    ctx.globalCompositeOperation = "lighter";
    ctx.filter = "blur(8px)";
    particles.forEach((p, i) => {
      const wave = phase * p.speed + p.drift;
      const dx = p.x - width / 2;
      const dy = p.y - height / 2;
      const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const orbit = 0.08 + smoothedLevel * 0.55 * intensity;
      p.x += Math.cos(wave + i * 0.09) * (0.16 + smoothedLevel * 1.2);
      p.y += Math.sin(wave * 0.76 + i * 0.04) * (0.16 + smoothedLevel * 1.05);
      p.x += (-dy / distance) * orbit;
      p.y += (dx / distance) * orbit;
      p.x += (width / 2 - p.x) * 0.00045;
      p.y += (height / 2 - p.y) * 0.00045;

      if (p.x < -80) p.x = width + 80;
      if (p.x > width + 80) p.x = -80;
      if (p.y < -80) p.y = height + 80;
      if (p.y > height + 80) p.y = -80;

      const radius = p.r * (1.15 + smoothedLevel * 3.6 * intensity);
      const alpha = Math.min(0.22, p.a * (0.2 + smoothedLevel * 0.9) * glow);
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      gradient.addColorStop(0, hexToRgba(palette[p.color], alpha));
      gradient.addColorStop(0.44, hexToRgba(palette[(p.color + 1) % palette.length], alpha * 0.22));
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(
        p.x,
        p.y,
        radius * (1.15 + seeded(i, 3) * 0.8),
        radius * (0.68 + seeded(i, 5) * 0.45),
        wave,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
    ctx.filter = "none";
    ctx.globalCompositeOperation = "source-over";
  }

  function drawCenterBloom() {
    const palette = palettes[elements.mood.value] || palettes.violet;
    const glow = Number(elements.glow.value);
    const radius = Math.min(width, height) * (0.18 + smoothedLevel * 0.28);
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, radius);
    gradient.addColorStop(0, hexToRgba(palette[0], 0.13 * glow * smoothedLevel));
    gradient.addColorStop(0.4, hexToRgba(palette[1], 0.08 * glow));
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function hexToRgba(hex, alpha) {
    const value = hex.replace("#", "");
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  elements.listen.addEventListener("click", toggleListening);
  elements.mic.addEventListener("change", () => {
    if (listening) {
      stopListening();
      toggleListening();
    }
  });

  window.addEventListener("resize", resize);
  resize();
  ctx.fillStyle = "#05060a";
  ctx.fillRect(0, 0, width, height);
  draw();
})();
