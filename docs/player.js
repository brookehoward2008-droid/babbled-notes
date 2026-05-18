/**
 * Lilt mobile demo player.
 *
 * Loads Tone.js, picks a synth per voice based on instrument_hint, schedules
 * all events on Tone.Transport, plays them, stops cleanly. iOS Safari and
 * mobile Chrome both require a user gesture before any audio is heard;
 * Tone.start() inside the Play tap handler satisfies that.
 */

(function () {
  const demos = window.LILT_DEMOS || [];

  const elements = {
    picker: document.getElementById("picker"),
    title: document.getElementById("now-title"),
    description: document.getElementById("now-description"),
    source: document.getElementById("now-source"),
    play: document.getElementById("play"),
    stop: document.getElementById("stop"),
    status: document.getElementById("status"),
  };

  let current = demos[0];
  let synths = [];
  let parts = [];
  let stopTimer = null;
  let isPlaying = false;

  function buildPicker() {
    elements.picker.innerHTML = "";
    demos.forEach((demo, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = demo.title;
      btn.setAttribute("aria-pressed", idx === 0 ? "true" : "false");
      btn.addEventListener("click", () => selectDemo(idx));
      elements.picker.appendChild(btn);
    });
  }

  function selectDemo(idx) {
    stopPlayback();
    current = demos[idx];
    Array.from(elements.picker.children).forEach((btn, i) => {
      btn.setAttribute("aria-pressed", i === idx ? "true" : "false");
    });
    elements.title.textContent = current.title;
    elements.description.textContent = current.payload.description || "";
    elements.source.textContent = current.lilt_source;
    elements.status.textContent = "";
  }

  function makeSynth(voice) {
    const hint = (voice.instrument_hint || "").toLowerCase();
    if (voice.kind === "drum") {
      if (hint.includes("kick") || hint.includes("bass-drum") || hint === "bd") {
        const s = new Tone.MembraneSynth({ octaves: 4, pitchDecay: 0.05 });
        s.volume.value = -4;
        return { synth: s.toDestination(), drumPitch: "C2" };
      }
      if (hint.includes("snare") || hint.includes("clap")) {
        const s = new Tone.NoiseSynth({
          noise: { type: "white" },
          envelope: { attack: 0.001, decay: 0.18, sustain: 0 },
        });
        s.volume.value = -10;
        return { synth: s.toDestination(), drumPitch: null };
      }
      if (hint.includes("hat") || hint.includes("cymbal") || hint.includes("ride")) {
        const s = new Tone.MetalSynth({
          envelope: { attack: 0.001, decay: 0.08, release: 0.04 },
          harmonicity: 5.1,
          modulationIndex: 32,
          resonance: 4000,
          octaves: 1.5,
        });
        s.volume.value = -22;
        return { synth: s.toDestination(), drumPitch: "C5" };
      }
      const s = new Tone.MembraneSynth();
      s.volume.value = -6;
      return { synth: s.toDestination(), drumPitch: "D2" };
    }

    if (hint.includes("pluck") || hint.includes("guitar")) {
      const s = new Tone.PolySynth(Tone.PluckSynth);
      s.volume.value = -6;
      return { synth: s.toDestination(), drumPitch: null };
    }
    const s = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.05, decay: 0.1, sustain: 0.55, release: 0.35 },
    });
    s.volume.value = -6;
    return { synth: s.toDestination(), drumPitch: null };
  }

  function trigger(entry, ev, time) {
    const { synth, drumPitch } = entry;
    if (synth instanceof Tone.NoiseSynth) {
      synth.triggerAttackRelease(ev.duration, time, ev.velocity);
      return;
    }
    const note = drumPitch || ev.note;
    synth.triggerAttackRelease(note, ev.duration, time, ev.velocity);
  }

  function disposeAll() {
    parts.forEach((p) => { try { p.dispose(); } catch (_) {} });
    synths.forEach((entry) => { try { entry.synth.dispose(); } catch (_) {} });
    parts = [];
    synths = [];
    if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
  }

  function stopPlayback() {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    Tone.getTransport().position = 0;
    disposeAll();
    isPlaying = false;
    elements.play.disabled = false;
    elements.stop.disabled = true;
    elements.status.textContent = "";
  }

  async function play() {
    if (isPlaying) return;
    elements.play.disabled = true;
    elements.status.textContent = "Starting...";

    try {
      await Tone.start();
    } catch (e) {
      elements.status.textContent = "Audio could not start. Tap Play again.";
      elements.play.disabled = false;
      return;
    }

    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    Tone.getTransport().position = 0;
    disposeAll();

    const payload = current.payload;

    payload.voices.forEach((voice) => {
      const entry = makeSynth(voice);
      synths.push(entry);
      const part = new Tone.Part((time, ev) => {
        trigger(entry, ev, time);
      }, voice.events.map((ev) => [ev.time, ev]));
      part.start(0);
      parts.push(part);
    });

    Tone.getTransport().start();
    isPlaying = true;
    elements.stop.disabled = false;
    elements.status.textContent = "Playing...";

    const totalMs = Math.ceil((payload.total_seconds + 0.4) * 1000);
    stopTimer = setTimeout(() => {
      stopPlayback();
      elements.status.textContent = "Done.";
    }, totalMs);
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildPicker();
    selectDemo(0);
    elements.play.addEventListener("click", play);
    elements.stop.addEventListener("click", () => {
      stopPlayback();
      elements.status.textContent = "Stopped.";
    });
    elements.stop.disabled = true;
  });
})();
