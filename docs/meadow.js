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
      life: document.getElementById("life-intensity"),
      animal: document.getElementById("animal-activity"),
      plant: document.getElementById("plant-growth"),
      butterfly: document.getElementById("butterfly-activity"),
      water: document.getElementById("water-flow"),
    },
    values: {
      life: document.getElementById("life-value"),
      animal: document.getElementById("animal-value"),
      plant: document.getElementById("plant-value"),
      butterfly: document.getElementById("butterfly-value"),
      water: document.getElementById("water-value"),
    },
    states: {
      deer: document.getElementById("deer-state"),
      rabbit: document.getElementById("rabbit-state"),
      squirrel: document.getElementById("squirrel-state"),
      bird: document.getElementById("bird-state"),
      butterfly: document.getElementById("butterfly-state"),
    },
    biomeButtons: document.querySelectorAll("[data-biome]"),
  };

  const biomes = {
    Meadow: { sky: ["#a7d8ff", "#dff4ff", "#446a37"], meadow: ["#7faa51", "#477832", "#183719"] },
    Forest: { sky: ["#1c4d3a", "#7dd99f", "#31563a"], meadow: ["#2f7a4f", "#1f5b38", "#102818"] },
    Spring: { sky: ["#fbcfe8", "#dff4ff", "#84cc16"], meadow: ["#a3d977", "#65a946", "#234a20"] },
    Autumn: { sky: ["#fed7aa", "#fef3c7", "#6b4b24"], meadow: ["#c9822c", "#7faa38", "#3b2b16"] },
    Dusk: { sky: ["#49366f", "#f8c893", "#0f172a"], meadow: ["#5b6b3d", "#2f4f31", "#111827"] },
    Winter: { sky: ["#e0f2fe", "#ffffff", "#bfdbfe"], meadow: ["#c7e6d2", "#8fbba6", "#31564c"] },
  };

  let width = 0;
  let height = 0;
  let ratio = 1;
  let flowers = [];
  let butterflies = [];
  let creatures = [];
  let analyser = null;
  let frequencyData = null;
  let audioContext = null;
  let listening = false;
  let voiceLevel = 42;
  let smoothed = 0.28;
  let notes = 0;
  let biome = "Meadow";
  let time = 0;

  function init() {
    for (let index = 0; index < 34; index += 1) {
      const bar = document.createElement("span");
      bar.style.setProperty("--i", index);
      bar.style.setProperty("--h", `${0.35 + (index % 9) * 0.16}rem`);
      elements.waveform.appendChild(bar);
    }
    resize();
    bind();
    requestAnimationFrame(draw);
  }

  function bind() {
    window.addEventListener("resize", resize);
    elements.record.addEventListener("click", () => {
      const classic = listening ? document.getElementById("record-stop") : document.getElementById("record");
      if (classic) classic.click();
    });

    Object.entries(elements.sliders).forEach(([key, input]) => {
      input.addEventListener("input", () => updateSliderValue(key));
      updateSliderValue(key);
    });

    elements.biomeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        biome = button.dataset.biome || "Meadow";
        elements.biomeButtons.forEach((item) => {
          item.setAttribute("aria-pressed", item === button ? "true" : "false");
        });
      });
    });

    window.addEventListener("babbled-recording-start", (event) => {
      startListening(event.detail && event.detail.stream);
    });
    window.addEventListener("babbled-recording-stop", stopListening);
    window.addEventListener("babbled-recording-denied", () => {
      elements.messageTitle.textContent = "Microphone permission is needed";
      elements.messageText.textContent = "Allow the mic to let Babbled Notes wake the world.";
    });
  }

  function updateSliderValue(key) {
    const value = elements.sliders[key].value;
    elements.values[key].textContent = `${value}%`;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    ratio = Math.max(1, window.devicePixelRatio || 1);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    seedWorld();
  }

  function seedWorld() {
    flowers = Array.from({ length: Math.max(70, Math.floor(width / 8)) }, (_, index) => ({
      x: width * seeded(index, 13),
      y: height * (0.57 + seeded(index, 17) * 0.36),
      size: 2 + seeded(index, 19) * 6,
      sway: seeded(index, 23) * Math.PI * 2,
      color: ["#f9a8d4", "#fde68a", "#ffffff", "#c4b5fd", "#bbf7d0"][index % 5],
    }));
    butterflies = Array.from({ length: 14 }, (_, index) => ({
      x: width * seeded(index, 29),
      y: height * (0.2 + seeded(index, 31) * 0.42),
      phase: seeded(index, 37) * Math.PI * 2,
      speed: 0.25 + seeded(index, 41) * 0.85,
      color: ["#f97316", "#fde047", "#93c5fd", "#f0abfc"][index % 4],
    }));
    creatures = Array.from({ length: 5 }, (_, index) => ({
      x: width * (0.12 + seeded(index, 43) * 0.76),
      y: height * (0.64 + seeded(index, 47) * 0.18),
      type: ["deer", "rabbit", "squirrel", "bird", "rabbit"][index],
      phase: seeded(index, 53) * Math.PI * 2,
      direction: seeded(index, 59) > 0.5 ? 1 : -1,
      scale: 0.7 + seeded(index, 61) * 0.55,
    }));
  }

  function startListening(stream) {
    listening = true;
    elements.record.classList.add("is-active");
    elements.waveform.classList.add("is-active");
    elements.label.textContent = "Listening...";
    elements.messageTitle.textContent = "Your voice nourishes the world";
    elements.messageText.textContent = "Keep going. The meadow loves it.";
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.84;
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
    } catch (_) {
      analyser = null;
      frequencyData = null;
    }
  }

  function stopListening() {
    listening = false;
    elements.record.classList.remove("is-active");
    elements.waveform.classList.remove("is-active");
    elements.label.textContent = "Start Recording";
    elements.messageTitle.textContent = "The meadow is listening";
    elements.messageText.textContent = "Speak, hum, or record babbled notes.";
    analyser = null;
    frequencyData = null;
    if (audioContext) {
      try { audioContext.close(); } catch (_) {}
    }
    audioContext = null;
  }

  function readVoiceLevel() {
    if (!listening) return 30 + Math.sin(time * 1.4) * 8;
    if (!analyser || !frequencyData) return 48 + Math.sin(time * 2) * 18;
    analyser.getByteFrequencyData(frequencyData);
    let sum = 0;
    for (let index = 2; index < frequencyData.length * 0.62; index += 1) {
      sum += frequencyData[index] / 255;
    }
    return clamp((sum / (frequencyData.length * 0.62)) * 280, 18, 100);
  }

  function draw() {
    time += 0.008 + (listening ? voiceLevel / 12000 : 0);
    voiceLevel += (readVoiceLevel() - voiceLevel) * 0.08;
    smoothed += (voiceLevel / 100 - smoothed) * 0.08;
    if (listening && Math.floor(time * 10) % 7 === 0) notes += 1;

    drawMountains();
    drawTrees();
    drawMeadow();
    drawBrook();
    drawFlowers();
    drawCreatures();
    drawButterflies();
    drawGlow();
    updateUi();
    requestAnimationFrame(draw);
  }

  function drawMountains() {
    const selected = biomes[biome] || biomes.Meadow;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, selected.sky[0]);
    sky.addColorStop(0.42, selected.sky[1]);
    sky.addColorStop(1, selected.sky[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.beginPath();
    ctx.arc(width * 0.73, height * 0.16, 38 + smoothed * 10, 0, Math.PI * 2);
    ctx.fill();

    [
      { y: 0.36, color: "rgba(219,234,254,.95)", peaks: [0.06, 0.2, 0.34, 0.48, 0.64, 0.82, 0.98] },
      { y: 0.43, color: "rgba(147,167,143,.82)", peaks: [0, 0.16, 0.31, 0.52, 0.7, 0.88, 1] },
      { y: 0.52, color: "rgba(49,86,58,.9)", peaks: [0, 0.12, 0.27, 0.43, 0.58, 0.76, 1] },
    ].forEach((layer, layerIndex) => {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(0, height * layer.y);
      layer.peaks.forEach((point, index) => {
        const peakHeight = height * (0.1 + ((index + layerIndex) % 3) * 0.055);
        ctx.lineTo(width * point, height * layer.y - peakHeight);
        ctx.lineTo(width * (point + 0.09), height * layer.y);
      });
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();
    });
  }

  function drawTrees() {
    for (let index = 0; index < 48; index += 1) {
      const x = (index / 47) * width + Math.sin(index) * 18;
      const base = height * (0.48 + Math.sin(index * 1.9) * 0.04);
      const treeHeight = height * (0.13 + (index % 5) * 0.012);
      ctx.fillStyle = index % 2 ? "#1f4f31" : "#163d2c";
      ctx.beginPath();
      ctx.moveTo(x, base - treeHeight);
      ctx.lineTo(x - treeHeight * 0.24, base);
      ctx.lineTo(x + treeHeight * 0.24, base);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#654321";
      ctx.fillRect(x - 2, base - 8, 4, 16);
    }
  }

  function drawMeadow() {
    const selected = biomes[biome] || biomes.Meadow;
    const meadow = ctx.createLinearGradient(0, height * 0.46, 0, height);
    meadow.addColorStop(0, selected.meadow[0]);
    meadow.addColorStop(0.45, selected.meadow[1]);
    meadow.addColorStop(1, selected.meadow[2]);
    ctx.fillStyle = meadow;
    ctx.fillRect(0, height * 0.45, width, height * 0.55);

    for (let index = 0; index < 180; index += 1) {
      const x = (index * 73) % width;
      const y = height * (0.52 + ((index * 37) % 46) / 100);
      const h = 10 + ((index * 19) % 28);
      const bend = Math.sin(time * 2 + index) * (2 + smoothed * 9);
      ctx.strokeStyle = index % 3 ? "rgba(190,242,100,.28)" : "rgba(236,252,203,.22)";
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.quadraticCurveTo(x + bend, y + h * 0.4, x + bend * 1.4, y);
      ctx.stroke();
    }
  }

  function drawBrook() {
    const water = Number(elements.sliders.water.value);
    const activity = listening ? 1 + voiceLevel / 90 : 0.55;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(width * 0.5, height * 0.5);
    for (let index = 0; index <= 80; index += 1) {
      const p = index / 80;
      const x = width * (0.5 + Math.sin(p * 8 + time * 2) * (0.035 + p * 0.08));
      const y = height * (0.5 + p * 0.5);
      const spread = width * (0.03 + p * 0.12);
      ctx.lineTo(x + spread, y);
    }
    for (let index = 80; index >= 0; index -= 1) {
      const p = index / 80;
      const x = width * (0.5 + Math.sin(p * 8 + time * 2) * (0.035 + p * 0.08));
      const y = height * (0.5 + p * 0.5);
      const spread = width * (0.03 + p * 0.12);
      ctx.lineTo(x - spread, y);
    }
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, height * 0.5, 0, height);
    gradient.addColorStop(0, "rgba(186,230,253,.55)");
    gradient.addColorStop(1, "rgba(14,165,233,.82)");
    ctx.fillStyle = gradient;
    ctx.shadowColor = "rgba(125,211,252,.75)";
    ctx.shadowBlur = 12 + water * 0.2;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,.62)";
    ctx.lineWidth = 1.5;
    for (let ripple = 0; ripple < 12; ripple += 1) {
      ctx.beginPath();
      const y = height * (0.54 + ripple * 0.04);
      for (let x = width * 0.36; x < width * 0.66; x += 12) {
        ctx.lineTo(x, y + Math.sin(x * 0.03 + time * (6 + water / 10) + ripple) * 3 * activity);
      }
      ctx.globalAlpha = 0.18 + activity * 0.08;
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawFlowers() {
    const plant = Number(elements.sliders.plant.value);
    flowers.forEach((flower) => {
      const bloom = 0.7 + plant / 120 + (listening ? voiceLevel / 180 : 0);
      const sway = Math.sin(time * 2.5 + flower.sway) * (2 + voiceLevel / 28);
      const x = flower.x + sway;
      ctx.strokeStyle = "rgba(132,204,22,.8)";
      ctx.beginPath();
      ctx.moveTo(x, flower.y + flower.size * 2);
      ctx.lineTo(x, flower.y - flower.size * 1.8);
      ctx.stroke();
      ctx.fillStyle = flower.color;
      ctx.globalAlpha = 0.72;
      for (let petal = 0; petal < 5; petal += 1) {
        const angle = (petal / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(angle) * flower.size * bloom, flower.y + Math.sin(angle) * flower.size * bloom, flower.size * 0.65 * bloom, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.arc(x, flower.y, flower.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function drawButterflies() {
    const butterflySetting = Number(elements.sliders.butterfly.value);
    butterflies.forEach((butterfly, index) => {
      const lift = listening ? 1 + voiceLevel / 95 + butterflySetting / 200 : 0.5;
      butterfly.x += Math.sin(time + butterfly.phase) * butterfly.speed * lift + 0.15;
      butterfly.y += Math.cos(time * 1.7 + butterfly.phase) * butterfly.speed * lift;
      if (butterfly.x > width + 30) butterfly.x = -30;
      const wing = Math.sin(time * 12 + index) * 4;
      ctx.fillStyle = butterfly.color;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.ellipse(butterfly.x - 4, butterfly.y, 4 + wing * 0.25, 7, -0.6, 0, Math.PI * 2);
      ctx.ellipse(butterfly.x + 4, butterfly.y, 4 - wing * 0.25, 7, 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function drawCreatures() {
    const animal = Number(elements.sliders.animal.value);
    creatures.forEach((creature, index) => {
      const active = listening ? 0.35 + voiceLevel / 80 + animal / 130 : 0.18;
      creature.x += Math.sin(time + creature.phase) * active * creature.direction;
      creature.y += Math.cos(time * 1.3 + creature.phase) * active * 0.25;
      if (creature.x < 30 || creature.x > width - 30) creature.direction *= -1;
      ctx.save();
      ctx.translate(creature.x, creature.y);
      ctx.scale(creature.direction * creature.scale, creature.scale);
      ctx.globalAlpha = 0.9;
      if (creature.type === "deer") drawDeer(index);
      if (creature.type === "rabbit") drawRabbit();
      if (creature.type === "squirrel") drawSquirrel();
      if (creature.type === "bird") drawBird();
      ctx.restore();
    });
  }

  function drawDeer(index) {
    ctx.fillStyle = "#9a693d";
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(26, -12, 11, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5b371f";
    ctx.lineWidth = 2;
    [-16, -4, 12, 22].forEach((leg) => {
      ctx.beginPath();
      ctx.moveTo(leg, 9);
      ctx.lineTo(leg + Math.sin(time * 4 + index) * 3, 29);
      ctx.stroke();
    });
  }

  function drawRabbit() {
    ctx.fillStyle = "#bda27c";
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI * 2);
    ctx.ellipse(14, -8, 8, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(12, -19, 3, 10, 0.2, 0, Math.PI * 2);
    ctx.ellipse(19, -18, 3, 9, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSquirrel() {
    ctx.fillStyle = "#a16207";
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
    ctx.arc(-12, -8, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBird() {
    ctx.fillStyle = "#60a5fa";
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2);
    ctx.moveTo(8, 0);
    ctx.lineTo(17, -3);
    ctx.lineTo(17, 3);
    ctx.closePath();
    ctx.fill();
  }

  function drawGlow() {
    const glow = ctx.createRadialGradient(width * 0.48, height * 0.5, 0, width * 0.48, height * 0.5, width * 0.75);
    glow.addColorStop(0, `rgba(255,255,255,${listening ? 0.06 + voiceLevel / 1600 : 0.025})`);
    glow.addColorStop(0.48, "rgba(255,255,255,0)");
    glow.addColorStop(1, "rgba(0,0,0,.35)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  function updateUi() {
    const settings = ["life", "animal", "plant", "butterfly", "water"].map((key) => Number(elements.sliders[key].value));
    const activity = clamp(Math.round((settings.reduce((sum, value) => sum + value, 0) + voiceLevel) / 6), 0, 100);
    elements.activity.textContent = `${activity}%`;
    elements.activityBar.style.width = `${activity}%`;
    elements.voiceMeter.style.width = `${voiceLevel}%`;
    elements.voiceLevel.textContent = `${Math.round(voiceLevel)}%`;
    elements.noteCount.textContent = `${Math.floor(notes / 10)} notes`;
    elements.activityState.textContent = activity > 80 ? "Thriving" : activity > 55 ? "Awakening" : "Quiet";
    elements.states.deer.textContent = listening ? "Grazing closer" : "Watching";
    elements.states.rabbit.textContent = listening && voiceLevel > 35 ? "Hopping" : "Hidden";
    elements.states.squirrel.textContent = listening && voiceLevel > 45 ? "Gathering" : "Still";
    elements.states.bird.textContent = listening && voiceLevel > 52 ? "Singing" : "Perched";
    elements.states.butterfly.textContent = listening && voiceLevel > 25 ? "Fluttering" : "Resting";
  }

  function seeded(index, salt) {
    const x = Math.sin(index * 999 + salt * 31) * 10000;
    return x - Math.floor(x);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  init();
})();
