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
    Meadow: { sky: ["#9fc8d8", "#d9ecdf", "#4d6944"], meadow: ["#86a963", "#4f7d40", "#1f3a22"] },
    Forest: { sky: ["#274a3a", "#8fbf99", "#263c30"], meadow: ["#477954", "#2b5739", "#122619"] },
    Spring: { sky: ["#d9c0ca", "#dcefe7", "#7cae62"], meadow: ["#97b978", "#6b9854", "#2c4a25"] },
    Autumn: { sky: ["#d6a873", "#d8cf9c", "#5d5638"], meadow: ["#a8743a", "#6f7e3b", "#312714"] },
    Dusk: { sky: ["#4d4665", "#b58f78", "#1b2630"], meadow: ["#5f6847", "#334b31", "#151d18"] },
    Winter: { sky: ["#d9e8ed", "#f5f5ef", "#a6bac0"], meadow: ["#bdcfc4", "#8fac9d", "#344d49"] },
  };

  let width = 0;
  let height = 0;
  let ratio = 1;
  let flowers = [];
  let butterflies = [];
  let creatures = [];
  let motes = [];
  let analyser = null;
  let frequencyData = null;
  let audioContext = null;
  let listening = false;
  let voiceLevel = 42;
  let smoothed = 0.28;
  let notes = 0;
  let lastNoteBeat = -1;
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
    flowers = Array.from({ length: Math.max(95, Math.floor(width / 7)) }, (_, index) => ({
      x: width * seeded(index, 13),
      y: height * (0.57 + seeded(index, 17) * 0.36),
      size: 1.2 + seeded(index, 19) * 4.4,
      sway: seeded(index, 23) * Math.PI * 2,
      color: ["#d9b1c7", "#d8c878", "#e8e7db", "#a99ac7", "#b9d4b3"][index % 5],
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
    motes = Array.from({ length: Math.max(36, Math.floor(width / 18)) }, (_, index) => ({
      x: width * seeded(index, 67),
      y: height * seeded(index, 71),
      radius: 0.8 + seeded(index, 73) * 2.8,
      phase: seeded(index, 79) * Math.PI * 2,
      speed: 0.18 + seeded(index, 83) * 0.72,
      hue: seeded(index, 89) > 0.45 ? "warm" : "cool",
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
    const noteBeat = Math.floor(time * (2.2 + smoothed * 4));
    if (listening && voiceLevel > 28 && noteBeat !== lastNoteBeat) {
      notes += 1;
      lastNoteBeat = noteBeat;
    }

    drawMountains();
    drawLightRibbons();
    drawTrees();
    drawMeadow();
    drawBrook();
    drawFlowers();
    drawCreatures();
    drawButterflies();
    drawMotes();
    drawMist();
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

    const halo = ctx.createRadialGradient(width * 0.73, height * 0.16, 0, width * 0.73, height * 0.16, width * 0.28);
    halo.addColorStop(0, `rgba(255,255,255,${0.14 + smoothed * 0.08})`);
    halo.addColorStop(0.36, "rgba(236,252,203,0.06)");
    halo.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height * 0.52);

    drawCloudBank();

    [
      { y: 0.34, color: "rgba(214,226,221,.86)", shadow: "rgba(92,112,101,.2)", peaks: [0.04, 0.2, 0.33, 0.5, 0.67, 0.84, 1] },
      { y: 0.42, color: "rgba(116,139,103,.72)", shadow: "rgba(47,72,54,.28)", peaks: [0, 0.13, 0.29, 0.49, 0.68, 0.86, 1] },
      { y: 0.51, color: "rgba(37,74,48,.88)", shadow: "rgba(12,32,21,.3)", peaks: [0, 0.1, 0.26, 0.44, 0.6, 0.78, 1] },
    ].forEach((layer, layerIndex) => {
      const slope = ctx.createLinearGradient(0, height * (layer.y - 0.16), 0, height * layer.y);
      slope.addColorStop(0, layer.color);
      slope.addColorStop(1, layer.shadow);
      ctx.fillStyle = slope;
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

  function drawCloudBank() {
    ctx.save();
    ctx.globalAlpha = 0.26;
    ctx.fillStyle = "rgba(255,255,255,.7)";
    for (let index = 0; index < 9; index += 1) {
      const x = width * seeded(index, 91);
      const y = height * (0.12 + seeded(index, 97) * 0.18);
      const rx = width * (0.035 + seeded(index, 101) * 0.05);
      const ry = height * (0.014 + seeded(index, 103) * 0.024);
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, seeded(index, 107) * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawLightRibbons() {
    const ribbonCount = 3;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let ribbon = 0; ribbon < ribbonCount; ribbon += 1) {
      const yBase = height * (0.18 + ribbon * 0.07);
      const amplitude = height * (0.018 + smoothed * 0.04 + ribbon * 0.008);
      const gradient = ctx.createLinearGradient(0, yBase, width, yBase + amplitude * 2);
      gradient.addColorStop(0, ribbon % 2 ? "rgba(125,211,252,0)" : "rgba(190,242,100,0)");
      gradient.addColorStop(0.5, ribbon % 2 ? `rgba(125,211,252,${0.1 + smoothed * 0.2})` : `rgba(236,252,203,${0.08 + smoothed * 0.16})`);
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 16 + smoothed * 28 - ribbon * 3;
      ctx.beginPath();
      for (let x = -20; x <= width + 20; x += 18) {
        const drift = Math.sin(x * 0.012 + time * (0.9 + ribbon * 0.34) + ribbon * 1.7);
        const y = yBase + drift * amplitude + Math.sin(x * 0.004 + ribbon) * height * 0.02;
        if (x === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTrees() {
    for (let index = 0; index < 68; index += 1) {
      const x = (index / 67) * width + Math.sin(index) * 18;
      const base = height * (0.48 + Math.sin(index * 1.9) * 0.04);
      const treeHeight = height * (0.12 + seeded(index, 109) * 0.12);
      const shade = seeded(index, 113);
      const trunk = 1.6 + seeded(index, 117) * 2.8;
      ctx.fillStyle = shade > 0.55 ? "rgba(28,58,36,.92)" : "rgba(19,47,34,.94)";
      ctx.fillRect(x - trunk / 2, base - treeHeight * 0.32, trunk, treeHeight * 0.34);

      if (index % 4 === 0) {
        const crown = ctx.createRadialGradient(x, base - treeHeight * 0.64, 2, x, base - treeHeight * 0.64, treeHeight * 0.32);
        crown.addColorStop(0, "rgba(75,121,69,.88)");
        crown.addColorStop(1, "rgba(22,64,39,.92)");
        ctx.fillStyle = crown;
        ctx.beginPath();
        ctx.ellipse(x, base - treeHeight * 0.62, treeHeight * 0.28, treeHeight * 0.22, 0, 0, Math.PI * 2);
        ctx.ellipse(x - treeHeight * 0.16, base - treeHeight * 0.55, treeHeight * 0.2, treeHeight * 0.16, 0.2, 0, Math.PI * 2);
        ctx.ellipse(x + treeHeight * 0.16, base - treeHeight * 0.55, treeHeight * 0.2, treeHeight * 0.16, -0.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        for (let tier = 0; tier < 4; tier += 1) {
          const tierY = base - treeHeight * (0.2 + tier * 0.18);
          const spread = treeHeight * (0.28 - tier * 0.035);
          ctx.beginPath();
          ctx.moveTo(x, tierY - treeHeight * 0.22);
          ctx.lineTo(x - spread, tierY + treeHeight * 0.08);
          ctx.lineTo(x + spread, tierY + treeHeight * 0.08);
          ctx.closePath();
          ctx.fill();
        }
      }
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

    ctx.save();
    ctx.globalAlpha = 0.18;
    for (let index = 0; index < 220; index += 1) {
      const x = width * seeded(index, 121);
      const y = height * (0.5 + seeded(index, 127) * 0.48);
      const radius = 8 + seeded(index, 131) * 34;
      const grassPatch = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grassPatch.addColorStop(0, index % 2 ? "rgba(218,232,165,.34)" : "rgba(17,67,34,.38)");
      grassPatch.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grassPatch;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    ctx.restore();

    for (let index = 0; index < 260; index += 1) {
      const x = (index * 73) % width;
      const y = height * (0.52 + ((index * 37) % 46) / 100);
      const h = 10 + ((index * 19) % 28);
      const bend = Math.sin(time * 2 + index) * (2 + smoothed * 9);
      ctx.strokeStyle = index % 3 ? "rgba(189,213,132,.24)" : "rgba(231,236,196,.18)";
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.quadraticCurveTo(x + bend, y + h * 0.4, x + bend * 1.4, y);
      ctx.stroke();
    }

    const groundGlow = ctx.createRadialGradient(width * 0.5, height * 0.72, 0, width * 0.5, height * 0.72, width * 0.55);
    groundGlow.addColorStop(0, `rgba(236,252,203,${0.03 + smoothed * 0.1})`);
    groundGlow.addColorStop(0.52, "rgba(125,211,252,0.025)");
    groundGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = groundGlow;
    ctx.fillRect(0, height * 0.42, width, height * 0.58);
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
    const reflection = ctx.createLinearGradient(width * 0.38, height * 0.52, width * 0.62, height);
    reflection.addColorStop(0, "rgba(255,255,255,.16)");
    reflection.addColorStop(0.5, "rgba(255,255,255,.04)");
    reflection.addColorStop(1, "rgba(255,255,255,.12)");
    ctx.fillStyle = reflection;
    ctx.globalAlpha = 0.62;
    ctx.fill();
    ctx.globalAlpha = 1;
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
    drawReeds(activity);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawReeds(activity) {
    for (let index = 0; index < 38; index += 1) {
      const side = index % 2 ? -1 : 1;
      const p = seeded(index, 137);
      const x = width * (0.5 + Math.sin(p * 8 + time * 2) * (0.04 + p * 0.1)) + side * width * (0.045 + p * 0.1);
      const y = height * (0.54 + p * 0.38);
      const h = 12 + seeded(index, 139) * 26;
      const bend = Math.sin(time * 1.8 + index) * (1.5 + activity * 2.4);
      ctx.strokeStyle = "rgba(40,78,36,.58)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + bend, y - h * 0.55, x + bend * 1.7, y - h);
      ctx.stroke();
      if (index % 3 === 0) {
        ctx.fillStyle = "rgba(124,91,54,.55)";
        ctx.beginPath();
        ctx.ellipse(x + bend * 1.8, y - h, 2.2, 5.5, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
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
      ctx.globalAlpha = 0.64;
      for (let petal = 0; petal < 6; petal += 1) {
        const angle = (petal / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(angle) * flower.size * bloom, flower.y + Math.sin(angle) * flower.size * bloom, flower.size * 0.46 * bloom, flower.size * 0.68 * bloom, angle, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#c9ad5b";
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

  function drawMotes() {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    motes.forEach((mote, index) => {
      const lift = listening ? 0.8 + smoothed * 1.9 : 0.45;
      mote.x += Math.sin(time * 0.8 + mote.phase) * 0.18 + mote.speed * 0.06;
      mote.y += Math.cos(time * 0.7 + mote.phase + index) * 0.14 - lift * 0.08;
      if (mote.x > width + 20) mote.x = -20;
      if (mote.y < -20) mote.y = height + 20;
      const pulse = 0.45 + Math.sin(time * 3 + mote.phase) * 0.25 + smoothed * 0.35;
      const glow = ctx.createRadialGradient(mote.x, mote.y, 0, mote.x, mote.y, mote.radius * (5 + smoothed * 5));
      const color = mote.hue === "warm" ? "236,252,203" : "125,211,252";
      glow.addColorStop(0, `rgba(${color},${0.42 * pulse})`);
      glow.addColorStop(0.35, `rgba(${color},${0.16 * pulse})`);
      glow.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.radius * (5 + smoothed * 5), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawMist() {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let layer = 0; layer < 4; layer += 1) {
      const y = height * (0.5 + layer * 0.095);
      const alpha = 0.035 + smoothed * 0.04 - layer * 0.004;
      const mist = ctx.createLinearGradient(0, y - 34, 0, y + 34);
      mist.addColorStop(0, "rgba(255,255,255,0)");
      mist.addColorStop(0.5, `rgba(224,242,254,${alpha})`);
      mist.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = mist;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= width; x += 24) {
        ctx.lineTo(x, y + Math.sin(x * 0.012 + time * (0.55 + layer * 0.08) + layer) * (12 + smoothed * 18));
      }
      ctx.lineTo(width, y + 54);
      ctx.lineTo(0, y + 54);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
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
    drawCreatureShadow(12, 22, 34, 7);
    const coat = ctx.createLinearGradient(-28, -20, 34, 18);
    coat.addColorStop(0, "#b38a5d");
    coat.addColorStop(0.55, "#8a5f38");
    coat.addColorStop(1, "#5d3a22");
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(26, -12, 11, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.32)";
    ctx.beginPath();
    ctx.arc(31, -14, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5b371f";
    ctx.lineWidth = 2;
    [-16, -4, 12, 22].forEach((leg) => {
      ctx.beginPath();
      ctx.moveTo(leg, 9);
      ctx.lineTo(leg + Math.sin(time * 4 + index) * 3, 29);
      ctx.stroke();
    });
    ctx.strokeStyle = "rgba(63,38,20,.72)";
    ctx.beginPath();
    ctx.moveTo(31, -19);
    ctx.lineTo(37, -30);
    ctx.moveTo(31, -19);
    ctx.lineTo(24, -29);
    ctx.stroke();
  }

  function drawRabbit() {
    drawCreatureShadow(0, 10, 19, 5);
    const fur = ctx.createLinearGradient(-12, -16, 18, 10);
    fur.addColorStop(0, "#d4c2a6");
    fur.addColorStop(1, "#8b765c");
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI * 2);
    ctx.ellipse(14, -8, 8, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(12, -19, 3, 10, 0.2, 0, Math.PI * 2);
    ctx.ellipse(19, -18, 3, 9, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.45)";
    ctx.beginPath();
    ctx.arc(-12, -2, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSquirrel() {
    drawCreatureShadow(0, 10, 18, 5);
    const fur = ctx.createLinearGradient(-18, -20, 15, 12);
    fur.addColorStop(0, "#b97939");
    fur.addColorStop(1, "#70451f");
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
    ctx.ellipse(-12, -10, 10, 16, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBird() {
    ctx.fillStyle = "#4f7f9f";
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2);
    ctx.moveTo(8, 0);
    ctx.lineTo(17, -3);
    ctx.lineTo(17, 3);
    ctx.closePath();
    ctx.fill();
  }

  function drawCreatureShadow(x, y, rx, ry) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
    elements.noteCount.textContent = `${notes} notes`;
    elements.activityState.textContent = activity > 80 ? "Thriving" : activity > 55 ? "Awakening" : "Quiet";
    elements.states.deer.textContent = listening ? "Grazing closer" : "Watching";
    elements.states.rabbit.textContent = listening && voiceLevel > 35 ? "Hopping" : "Hidden";
    elements.states.squirrel.textContent = listening && voiceLevel > 45 ? "Gathering" : "Still";
    elements.states.bird.textContent = listening && voiceLevel > 52 ? "Singing" : "Perched";
    elements.states.butterfly.textContent = listening && voiceLevel > 25 ? "Fluttering" : "Resting";
    setCreatureActivity("deer-state", listening);
    setCreatureActivity("rabbit-state", listening && voiceLevel > 35);
    setCreatureActivity("squirrel-state", listening && voiceLevel > 45);
    setCreatureActivity("bird-state", listening && voiceLevel > 52);
    setCreatureActivity("butterfly-state", listening && voiceLevel > 25);
  }

  function setCreatureActivity(id, active) {
    const card = document.getElementById(id);
    if (card && card.parentElement) {
      card.parentElement.classList.toggle("is-active", Boolean(active));
    }
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
