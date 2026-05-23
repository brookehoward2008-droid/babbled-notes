(function () {
  const elements = {
    source: document.getElementById("composer-source"),
    instrument: document.getElementById("composer-instrument"),
    styleButtons: document.querySelectorAll("[data-composer-style]"),
    spaceButtons: document.querySelectorAll("[data-sound-space]"),
    play: document.getElementById("composer-play"),
    loop: document.getElementById("composer-loop"),
    stop: document.getElementById("composer-stop"),
    save: document.getElementById("composer-save"),
    open: document.getElementById("composer-open"),
    loadDemo: document.getElementById("composer-load-demo"),
    file: document.getElementById("composer-file"),
    status: document.getElementById("composer-status"),
    toolbar: document.querySelector(".composer-toolbar"),
    summaryTempo: document.getElementById("composer-tempo"),
    summaryVoices: document.getElementById("composer-voices"),
    summaryEvents: document.getElementById("composer-events"),
    summaryLength: document.getElementById("composer-length"),
  };

  if (!elements.source || !elements.play) return;

  const NOTE_RE = /^[A-G](#|b)?[0-8]$/;
  let synths = [];
  let parts = [];
  let stopTimer = null;
  let lastSelection = null;
  let style = "chopin";
  let space = "room";
  let looping = false;

  function setStatus(text) {
    elements.status.textContent = text;
  }

  function updateSummary() {
    try {
      const compiled = buildEvents(parseLilt(elements.source.value));
      const eventCount = compiled.voices.reduce((sum, voice) => {
        return sum + voice.tokens.length;
      }, 0);
      elements.summaryTempo.textContent = String(compiled.tempo);
      elements.summaryVoices.textContent = String(compiled.voices.length);
      elements.summaryEvents.textContent = String(eventCount);
      elements.summaryLength.textContent = `${Math.max(1, Math.round(compiled.totalSeconds))}s`;
    } catch (_) {
      elements.summaryTempo.textContent = "-";
      elements.summaryVoices.textContent = "-";
      elements.summaryEvents.textContent = "-";
      elements.summaryLength.textContent = "-";
    }
  }

  function dispose() {
    parts.forEach((part) => { try { part.dispose(); } catch (_) {} });
    synths.forEach((synth) => { try { synth.dispose(); } catch (_) {} });
    parts = [];
    synths = [];
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
  }

  function setStyle(next) {
    style = next || "chopin";
    elements.styleButtons.forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.composerStyle === style ? "true" : "false");
    });
    setStatus(`${styleLabel()} style selected.`);
  }

  function setSpace(next) {
    space = next || "room";
    elements.spaceButtons.forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.soundSpace === space ? "true" : "false");
    });
    setStatus(`${spaceLabel()} sound space selected.`);
  }

  function parseLilt(text) {
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const out = { tempo: 80, voices: [] };
    let current = null;

    lines.forEach((raw) => {
      const line = raw.trim();
      if (!line || line.startsWith("#")) return;
      if (line.startsWith("tempo ")) {
        const tempo = Number(line.split(/\s+/)[1]);
        if (Number.isFinite(tempo) && tempo > 20 && tempo < 320) out.tempo = tempo;
        return;
      }
      const voiceMatch = line.match(/^voice\s+([a-zA-Z0-9-]+):$/);
      if (voiceMatch) {
        current = {
          name: voiceMatch[1],
          kind: /kick|snare|hat|pulse|drum/i.test(voiceMatch[1]) ? "drum" : "pitched",
          tokens: [],
        };
        out.voices.push(current);
        return;
      }
      if (current) current.tokens.push(...tokenizeBar(line));
    });

    if (!out.voices.length) throw new Error("Add at least one voice block.");
    return out;
  }

  function tokenizeBar(line) {
    const rawTokens = line.split(/\s+/).filter(Boolean);
    const tokens = [];
    for (let i = 0; i < rawTokens.length; i += 1) {
      const token = rawTokens[i];
      if (token === ".") {
        tokens.push({ type: "rest", beats: 1 });
      } else if (token === "x" || token === "o") {
        tokens.push({ type: "hit", soft: token === "o", beats: 0.5 });
      } else if (token === "rest") {
        const beats = Number(rawTokens[i + 1]);
        tokens.push({ type: "rest", beats: Number.isFinite(beats) ? beats : 1 });
        if (Number.isFinite(beats)) i += 1;
      } else if (NOTE_RE.test(token)) {
        const note = { type: "note", note: token, beats: 1, velocity: 0.65 };
        for (let j = i + 1; j < rawTokens.length; j += 1) {
          const next = rawTokens[j];
          if (NOTE_RE.test(next) || next === "rest" || next === "." || next === "x" || next === "o") break;
          if (next === "hold") note.beats = 2;
          if (next === "soft") note.velocity = 0.4;
          if (next === "mf") note.velocity = 0.65;
          if (next === "loud") note.velocity = 0.9;
          i = j;
        }
        tokens.push(note);
      }
    }
    return tokens;
  }

  function buildEvents(song) {
    const spb = 60 / song.tempo;
    let maxEnd = 0;
    const voices = song.voices.map((voice) => {
      let cursor = 0;
      const events = [];
      voice.tokens.forEach((token) => {
        if (token.type === "rest") {
          cursor += token.beats * spb;
          return;
        }
        if (token.type === "hit") {
          events.push({
            time: cursor,
            duration: 0.1,
            velocity: token.soft ? 0.35 : 0.75,
            note: drumPitch(voice.name),
          });
          cursor += token.beats * spb;
          return;
        }
        if (token.type === "note") {
          const duration = token.beats * spb;
          events.push({
            time: cursor,
            duration: duration,
            velocity: token.velocity,
            note: token.note,
          });
          cursor += duration;
        }
      });
      maxEnd = Math.max(maxEnd, cursor);
      return Object.assign({}, voice, { events });
    });
    return { tempo: song.tempo, voices, totalSeconds: maxEnd };
  }

  function drumPitch(name) {
    const lower = name.toLowerCase();
    if (lower.includes("snare")) return "D2";
    if (lower.includes("hat")) return "F#2";
    return "C2";
  }

  function makeSynth(voice) {
    if (voice.kind === "drum") {
      const lower = voice.name.toLowerCase();
      if (lower.includes("snare")) {
        const s = new Tone.MembraneSynth({
          pitchDecay: 0.01,
          octaves: 1.5,
          oscillator: { type: "triangle" },
          envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.03 },
        });
        s.volume.value = -16;
        return connectStudio(s);
      }
      const s = new Tone.MembraneSynth({
        octaves: 5,
        pitchDecay: 0.035,
        envelope: { attack: 0.001, decay: 0.42, sustain: 0.01, release: 0.08 },
      });
      s.volume.value = -5;
      return connectStudio(s);
    }
    const styled = makeClassicalSynth(style);
    if (styled) return connectStudio(styled, voice.name);
    const factory = window.LILT_SYNTHS && window.LILT_SYNTHS.makePitchedSynth;
    return connectStudio(factory ? factory(elements.instrument.value) : new Tone.PolySynth(Tone.Synth), voice.name);
  }

  function makeClassicalSynth(mode) {
    if (mode === "bach") {
      const s = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.018, decay: 0.16, sustain: 0.72, release: 0.58 },
      });
      s.volume.value = -12;
      return s;
    }
    if (mode === "mozart") {
      const s = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope: { attack: 0.008, decay: 0.18, sustain: 0.22, release: 0.54 },
      });
      s.volume.value = -10;
      return s;
    }
    if (mode === "beethoven") {
      const s = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.006, decay: 0.3, sustain: 0.24, release: 0.82 },
      });
      s.volume.value = -9;
      return s;
    }
    const s = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.04, decay: 0.28, sustain: 0.46, release: 1.4 },
    });
    s.volume.value = -13;
    return s;
  }

  function connectStudio(synth, name) {
    const connector = window.LILT_SYNTHS && window.LILT_SYNTHS.connectStudio;
    if (!connector) return synth.toDestination();
    const spatialName = space === "center" ? "workspace" : `${name || "workspace"}-${space}`;
    return connector(synth, spatialName);
  }

  async function play(forever) {
    try {
      await Tone.start();
      const compiled = buildEvents(parseLilt(elements.source.value));
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      Tone.getTransport().position = 0;
      Tone.getTransport().loop = false;
      dispose();

      compiled.voices.forEach((voice) => {
        const synth = makeSynth(voice);
        synths.push(synth);
        const part = new Tone.Part((time, event) => {
          const humanTime = window.LILT_SYNTHS && window.LILT_SYNTHS.humanizeTime;
          const humanVelocity = window.LILT_SYNTHS && window.LILT_SYNTHS.humanizeVelocity;
          synth.triggerAttackRelease(
            event.note,
            styledDuration(event.duration),
            humanTime ? humanTime(time, 1) : time,
            humanVelocity ? humanVelocity(styledVelocity(event.velocity), 0.08) : styledVelocity(event.velocity)
          );
        }, voice.events.map((event) => [event.time, event]));
        part.start(0);
        parts.push(part);
      });

      if (forever) {
        Tone.getTransport().loop = true;
        Tone.getTransport().loopStart = 0;
        Tone.getTransport().loopEnd = Math.max(1.25, compiled.totalSeconds + loopGap());
      }
      Tone.getTransport().start();
      looping = Boolean(forever);
      elements.loop.setAttribute("aria-pressed", looping ? "true" : "false");
      setStatus(forever ? `Playing forever in ${styleLabel()} style, ${spaceLabel()} space.` : `Playing once in ${styleLabel()} style, ${spaceLabel()} space.`);
      if (!forever) {
        stopTimer = setTimeout(stop, Math.ceil((compiled.totalSeconds + 0.4) * 1000));
      }
    } catch (e) {
      setStatus(`Could not play: ${e.message}`);
    }
  }

  function styledDuration(duration) {
    const amount = style === "bach" ? 0.88 : style === "beethoven" ? 1.05 : style === "chopin" ? 1.12 : 0.94;
    return Math.max(0.08, duration * amount);
  }

  function styledVelocity(velocity) {
    const lift = style === "beethoven" ? 0.12 : style === "mozart" ? 0.04 : style === "chopin" ? -0.08 : 0;
    return Math.max(0.22, Math.min(0.92, velocity + lift));
  }

  function loopGap() {
    return style === "bach" ? 0.18 : style === "beethoven" ? 0.5 : style === "chopin" ? 0.72 : 0.32;
  }

  function styleLabel() {
    return style.charAt(0).toUpperCase() + style.slice(1);
  }

  function spaceLabel() {
    return space === "hall" ? "Concert hall" : space.charAt(0).toUpperCase() + space.slice(1);
  }

  function stop() {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    Tone.getTransport().position = 0;
    Tone.getTransport().loop = false;
    looping = false;
    elements.loop.setAttribute("aria-pressed", "false");
    dispose();
    setStatus("Stopped.");
  }

  function save() {
    const blob = new Blob([elements.source.value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lilt-song.lilt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus("Saved .lilt file.");
  }

  function openFile() {
    elements.file.click();
  }

  function rememberSelection() {
    lastSelection = {
      start: elements.source.selectionStart,
      end: elements.source.selectionEnd,
    };
  }

  function insertToken(text) {
    const selection = document.activeElement === elements.source
      ? { start: elements.source.selectionStart, end: elements.source.selectionEnd }
      : lastSelection || {
        start: elements.source.value.length,
        end: elements.source.value.length,
      };
    const start = selection.start;
    const end = selection.end;
    const before = elements.source.value.slice(0, start);
    const after = elements.source.value.slice(end);
    const prefix = before && !/\s$/.test(before) ? " " : "";
    const suffix = after && !/^\s/.test(after) ? " " : "";
    const insert = prefix + text + suffix;
    elements.source.value = before + insert + after;
    const cursor = start + insert.length;
    elements.source.focus();
    elements.source.setSelectionRange(cursor, cursor);
    rememberSelection();
    updateSummary();
    setStatus("Added to workspace.");
  }

  function readFile() {
    const file = elements.file.files && elements.file.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      elements.source.value = String(reader.result || "");
      updateSummary();
      setStatus(`Opened ${file.name}.`);
    });
    reader.readAsText(file);
    elements.file.value = "";
  }

  function loadSelectedDemo() {
    const title = document.getElementById("now-title");
    const source = document.getElementById("now-source");
    elements.source.value = source && source.textContent ? source.textContent : elements.source.value;
    updateSummary();
    setStatus(`Loaded ${title && title.textContent ? title.textContent : "demo"} into workspace.`);
  }

  document.addEventListener("DOMContentLoaded", () => {
    updateSummary();
    elements.play.addEventListener("click", () => play(false));
    elements.loop.addEventListener("click", () => {
      if (looping) stop();
      else play(true);
    });
    elements.stop.addEventListener("click", stop);
    elements.save.addEventListener("click", save);
    elements.open.addEventListener("click", openFile);
    elements.file.addEventListener("change", readFile);
    elements.loadDemo.addEventListener("click", loadSelectedDemo);
    elements.styleButtons.forEach((button) => {
      button.addEventListener("click", () => setStyle(button.dataset.composerStyle));
    });
    elements.spaceButtons.forEach((button) => {
      button.addEventListener("click", () => setSpace(button.dataset.soundSpace));
    });
    elements.source.addEventListener("input", () => {
      rememberSelection();
      updateSummary();
    });
    elements.source.addEventListener("click", rememberSelection);
    elements.source.addEventListener("keyup", rememberSelection);
    elements.source.addEventListener("select", rememberSelection);
    elements.toolbar.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-insert]");
      if (!button) return;
      insertToken(button.dataset.insert);
    });
  });
})();
