(function () {
  const elements = {
    buttons: document.querySelectorAll(".tap-grid button"),
    source: document.getElementById("tap-source"),
    instrument: document.getElementById("tap-instrument"),
    play: document.getElementById("tap-play"),
    reset: document.getElementById("tap-reset"),
    status: document.getElementById("tap-status"),
  };

  if (!elements.source || !elements.play) return;

  let events = [];
  let synth = null;
  let part = null;

  function addEvent(note) {
    if (events.length >= 16) {
      elements.status.textContent = "Phrase is full. Reset to start again.";
      return;
    }
    events.push(note);
    render();
    elements.status.textContent = note === "rest" ? "Rest added." : `${note} added.`;
  }

  function render() {
    const line = events.length
      ? events.map((note) => note === "rest" ? "rest 1" : `${note} ! mf`).join(" ")
      : "rest 4";
    elements.source.textContent =
      "tempo 80\n" +
      "feel straight\n" +
      "key C major\n" +
      "\n" +
      "mood gentle\n" +
      "\n" +
      "voice voice:\n" +
      `  ${line}\n`;
  }

  function dispose() {
    if (part) { try { part.dispose(); } catch (_) {} }
    if (synth) { try { synth.dispose(); } catch (_) {} }
    part = null;
    synth = null;
  }

  async function play() {
    if (!events.length) {
      elements.status.textContent = "Add at least one note first.";
      return;
    }
    try {
      await Tone.start();
    } catch (e) {
      elements.status.textContent = "Audio could not start. Tap Play again.";
      return;
    }

    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    Tone.getTransport().position = 0;
    dispose();

    const factory = window.LILT_SYNTHS && window.LILT_SYNTHS.makePitchedSynth;
    const connector = window.LILT_SYNTHS && window.LILT_SYNTHS.connectStudio;
    synth = factory ? factory(elements.instrument.value) : new Tone.PolySynth(Tone.Synth);
    synth = connector ? connector(synth) : synth.toDestination();
    const toneEvents = events
      .map((note, idx) => ({ note, time: idx * 0.75 }))
      .filter((event) => event.note !== "rest");

    part = new Tone.Part((time, event) => {
      const humanTime = window.LILT_SYNTHS && window.LILT_SYNTHS.humanizeTime;
      const humanVelocity = window.LILT_SYNTHS && window.LILT_SYNTHS.humanizeVelocity;
      synth.triggerAttackRelease(
        event.note,
        0.62,
        humanTime ? humanTime(time, 1) : time,
        humanVelocity ? humanVelocity(0.65, 0.08) : 0.65
      );
    }, toneEvents.map((event) => [event.time, event]));
    part.start(0);
    Tone.getTransport().start();
    elements.status.textContent = "Playing taps...";
    setTimeout(() => {
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      dispose();
      elements.status.textContent = "Done.";
    }, Math.ceil((events.length * 0.75 + 0.4) * 1000));
  }

  function reset() {
    events = [];
    dispose();
    render();
    elements.status.textContent = "Cleared.";
  }

  document.addEventListener("DOMContentLoaded", () => {
    elements.buttons.forEach((button) => {
      button.addEventListener("click", () => addEvent(button.dataset.note));
    });
    elements.play.addEventListener("click", play);
    elements.reset.addEventListener("click", reset);
    render();
  });
})();
