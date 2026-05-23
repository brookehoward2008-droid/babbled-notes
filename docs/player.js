/**
 * Babbled Notes demo player + session reporter.
 *
 * - Loads Tone.js and plays the selected demo via per-voice synths.
 * - Quietly logs the user's session (which demos played, did playback
 *   start, did it run to completion) into a local report object.
 * - Lets the user OPT IN to share the report: prefilled GitHub Issue
 *   or downloadable JSON. Nothing is sent until the user taps a button.
 */

(function () {
  const demos = window.LILT_DEMOS || [];
  const REPO = "brookehoward2008-droid/babbled-notes";

  const elements = {
    picker: document.getElementById("picker"),
    title: document.getElementById("now-title"),
    description: document.getElementById("now-description"),
    source: document.getElementById("now-source"),
    demoInstrument: document.getElementById("demo-instrument"),
    play: document.getElementById("play"),
    stop: document.getElementById("stop"),
    status: document.getElementById("status"),
    ratingButtons: document.querySelectorAll(".rating-buttons button"),
    comment: document.getElementById("comment"),
    reportPreview: document.getElementById("report-preview"),
    sendGithub: document.getElementById("send-github"),
    downloadReport: document.getElementById("download-report"),
    feedbackStatus: document.getElementById("feedback-status"),
  };

  // ---------------------------------------------------------------
  // Session report
  // ---------------------------------------------------------------

  const report = {
    schema: "babbled-notes-demo-report/v1",
    session_id: makeSessionId(),
    started_at: new Date().toISOString(),
    page_url: location.href,
    rating: null,
    comment: "",
    device: {
      user_agent: navigator.userAgent,
      language: navigator.language,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      color_scheme: window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light",
      reduced_motion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    },
    events: [],
    demos_played: {},
  };

  function makeSessionId() {
    if (window.crypto && window.crypto.randomUUID) return crypto.randomUUID();
    return "s_" + Math.random().toString(36).slice(2, 10);
  }

  function logEvent(type, data) {
    const ev = Object.assign(
      { t: new Date().toISOString(), type: type },
      data || {}
    );
    report.events.push(ev);
    renderReportPreview();
  }

  function recordPlayed(demoId, completed, audible_ms) {
    const entry = report.demos_played[demoId] || {
      plays: 0,
      completed: 0,
      audible_ms: 0,
    };
    entry.plays += 1;
    if (completed) entry.completed += 1;
    entry.audible_ms += Math.max(0, audible_ms | 0);
    report.demos_played[demoId] = entry;
  }

  function renderReportPreview() {
    const compact = compactReport();
    elements.reportPreview.textContent = JSON.stringify(compact, null, 2);
  }

  function compactReport() {
    // Mirror report; trim the user_agent for the preview but keep
    // the full one in the actual submission.
    const out = JSON.parse(JSON.stringify(report));
    out.rating = report.rating;
    out.comment = elements.comment.value.trim().slice(0, 280);
    return out;
  }

  // ---------------------------------------------------------------
  // Demo picker + playback
  // ---------------------------------------------------------------

  let current = demos[0];
  let synths = [];
  let parts = [];
  let stopTimer = null;
  let isPlaying = false;
  let playStartMs = 0;
  let currentExpectedMs = 0;
  let studioChain = null;
  const HUMANIZE_SECONDS = 0.018;

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
    stopPlayback(false);
    current = demos[idx];
    Array.from(elements.picker.children).forEach((btn, i) => {
      btn.setAttribute("aria-pressed", i === idx ? "true" : "false");
    });
    elements.title.textContent = current.title;
    elements.description.textContent = current.payload.description || "";
    elements.source.textContent = current.lilt_source;
    elements.status.textContent = "";
    logEvent("select_demo", { demo_id: current.id });
  }

  function makeSynth(voice) {
    const selected = elements.demoInstrument ? elements.demoInstrument.value : "auto";
    if (voice.kind !== "drum" && selected !== "auto") {
      return { synth: connectStudio(makePitchedSynth(selected), voice.name), drumPitch: null, style: selected };
    }

    const hint = (voice.instrument_hint || "").toLowerCase();
    if (voice.kind === "drum") {
      if (hint.includes("kick") || hint.includes("bass-drum") || hint === "bd") {
        const s = new Tone.MembraneSynth({
          octaves: 5,
          pitchDecay: 0.035,
          envelope: { attack: 0.001, decay: 0.42, sustain: 0.01, release: 0.08 },
        });
        s.volume.value = -5;
        return { synth: connectStudio(s, voice.name), drumPitch: "C2", style: "drum" };
      }
      if (hint.includes("snare") || hint.includes("clap")) {
        const s = new Tone.MembraneSynth({
          pitchDecay: 0.01,
          octaves: 1.5,
          oscillator: { type: "triangle" },
          envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.03 },
        });
        s.volume.value = -16;
        return { synth: connectStudio(s, voice.name), drumPitch: "D2", style: "drum" };
      }
      if (hint.includes("hat") || hint.includes("cymbal") || hint.includes("ride")) {
        const s = new Tone.Synth({
          oscillator: { type: "sine" },
          envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.02 },
        });
        s.volume.value = -20;
        return { synth: connectStudio(s, voice.name), drumPitch: "F#5", style: "drum" };
      }
      const s = new Tone.MembraneSynth();
      s.volume.value = -6;
      return { synth: connectStudio(s, voice.name), drumPitch: "D2", style: "drum" };
    }

    if (hint.includes("pluck") || hint.includes("guitar")) {
      return { synth: connectStudio(makePitchedSynth("wire"), voice.name), drumPitch: null, style: "wire" };
    }
    if (hint.includes("bird") || hint.includes("chirp") || hint.includes("whistle")) {
      return { synth: connectStudio(makePitchedSynth("bird"), voice.name), drumPitch: null, style: "bird" };
    }
    return { synth: connectStudio(makePitchedSynth("pad"), voice.name), drumPitch: null, style: "pad" };
  }

  function makePitchedSynth(mode) {
    if (mode === "piano") {
      const s = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.22, sustain: 0.1, release: 0.72 },
      });
      s.volume.value = -10;
      return s;
    }
    if (mode === "wire") {
      const s = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.004, decay: 0.22, sustain: 0.06, release: 0.62 },
      });
      s.volume.value = -12;
      return s;
    }
    if (mode === "bird") {
      const s = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope: { attack: 0.003, decay: 0.07, sustain: 0.02, release: 0.16 },
      });
      s.volume.value = -16;
      return s;
    }
    if (mode === "pluck") {
      const s = new Tone.PolySynth(Tone.PluckSynth, {
        attackNoise: 0.38,
        dampening: 5200,
        resonance: 0.62,
      });
      s.volume.value = -12;
      return s;
    }
    if (mode === "bell") {
      const s = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 1.8,
        modulationIndex: 4.2,
        envelope: { attack: 0.012, decay: 0.28, sustain: 0.03, release: 0.95 },
        modulationEnvelope: { attack: 0.01, decay: 0.22, sustain: 0, release: 0.45 },
      });
      s.volume.value = -14;
      return s;
    }
    const s = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.16, decay: 0.2, sustain: 0.58, release: 1.25 },
    });
    s.volume.value = -11;
    return s;
  }

  function studioDestination() {
    if (studioChain) return studioChain.input;
    Tone.getDestination().volume.value = -4;
    const compressor = new Tone.Compressor({
      threshold: -18,
      ratio: 2.4,
      attack: 0.004,
      release: 0.22,
    });
    const toneFilter = new Tone.Filter({
      frequency: 6800,
      type: "lowpass",
      rolloff: -12,
    });
    const delay = new Tone.FeedbackDelay({
      delayTime: "8n",
      feedback: 0.12,
      wet: 0.065,
    });
    const reverb = new Tone.Reverb({
      decay: 2.4,
      preDelay: 0.025,
      wet: 0.16,
    });
    const limiter = new Tone.Limiter(-1);
    compressor.chain(toneFilter, delay, reverb, limiter, Tone.getDestination());
    studioChain = { input: compressor, toneFilter, delay, reverb, limiter };
    return studioChain.input;
  }

  function connectStudio(node, name) {
    const pan = new Tone.Panner(stereoPosition(name || ""));
    node.connect(pan);
    pan.connect(studioDestination());
    return node;
  }

  function stereoPosition(name) {
    const lower = name.toLowerCase();
    if (lower.includes("hall")) {
      if (lower.includes("bass") || lower.includes("kick")) return -0.18;
      if (lower.includes("pulse") || lower.includes("hat")) return 0.34;
      if (lower.includes("melody") || lower.includes("voice")) return -0.28;
      return 0.24;
    }
    if (lower.includes("room")) {
      if (lower.includes("bass") || lower.includes("kick")) return 0;
      if (lower.includes("pulse") || lower.includes("hat")) return 0.24;
      if (lower.includes("melody") || lower.includes("voice")) return -0.18;
      return 0.14;
    }
    if (lower.includes("bass") || lower.includes("kick")) return 0;
    if (lower.includes("pulse") || lower.includes("hat")) return 0.18;
    if (lower.includes("melody") || lower.includes("voice")) return -0.12;
    return 0.08;
  }

  window.LILT_SYNTHS = {
    makePitchedSynth: makePitchedSynth,
    connectStudio: connectStudio,
    humanizeTime: humanizeTime,
    humanizeVelocity: humanizeVelocity,
  };

  function trigger(entry, ev, time) {
    const { synth, drumPitch, style } = entry;
    if (synth instanceof Tone.NoiseSynth) {
      synth.triggerAttackRelease(ev.duration, humanizeTime(time, 0.5), humanizeVelocity(ev.velocity, 0.06));
      return;
    }
    const note = drumPitch || ev.note;
    const start = humanizeTime(time, 1);
    const velocity = humanizeVelocity(ev.velocity, style === "bird" ? 0.14 : 0.08);
    if (style === "bird" && !drumPitch) {
      const chirp = transposeNote(note, 7);
      synth.triggerAttackRelease(note, Math.min(0.14, softenDuration(ev.duration) * 0.5), start, velocity);
      synth.triggerAttackRelease(chirp, 0.08, start + 0.055, Math.max(0.18, velocity * 0.72));
      return;
    }
    synth.triggerAttackRelease(note, softenDuration(ev.duration), start, velocity);
  }

  function transposeNote(note, semitones) {
    try {
      return Tone.Frequency(note).transpose(semitones).toNote();
    } catch (_) {
      return note;
    }
  }

  function humanizeTime(time, amount) {
    return Math.max(0, time + (Math.random() - 0.5) * HUMANIZE_SECONDS * amount);
  }

  function humanizeVelocity(velocity, amount) {
    const next = velocity + (Math.random() - 0.5) * amount;
    return Math.max(0.22, Math.min(0.92, next));
  }

  function softenDuration(duration) {
    return Math.max(0.08, duration * 0.96);
  }

  function disposeAll() {
    parts.forEach((p) => { try { p.dispose(); } catch (_) {} });
    synths.forEach((entry) => { try { entry.synth.dispose(); } catch (_) {} });
    parts = [];
    synths = [];
    if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
  }

  function stopPlayback(logIt) {
    const wasPlaying = isPlaying;
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    Tone.getTransport().position = 0;
    disposeAll();
    isPlaying = false;
    elements.play.disabled = false;
    elements.stop.disabled = true;
    if (wasPlaying) {
      const audible = Date.now() - playStartMs;
      const completed = audible + 50 >= currentExpectedMs;
      recordPlayed(current.id, completed, audible);
      if (logIt) {
        logEvent("play_ended", {
          demo_id: current.id,
          completed: completed,
          audible_ms: audible,
        });
      }
    }
  }

  async function play() {
    if (isPlaying) return;
    elements.play.disabled = true;
    elements.status.textContent = "Starting...";
    logEvent("play_clicked", { demo_id: current.id });

    try {
      await Tone.start();
    } catch (e) {
      logEvent("audio_unlock_failed", { demo_id: current.id, message: String(e) });
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
    playStartMs = Date.now();
    currentExpectedMs = Math.ceil(payload.total_seconds * 1000);
    elements.stop.disabled = false;
    elements.status.textContent = "Playing...";
    logEvent("play_started", { demo_id: current.id });

    const totalMs = Math.ceil((payload.total_seconds + 0.4) * 1000);
    stopTimer = setTimeout(() => {
      stopPlayback(true);
      elements.status.textContent = "Done.";
    }, totalMs);
  }

  // ---------------------------------------------------------------
  // Feedback UI
  // ---------------------------------------------------------------

  function bindRating() {
    elements.ratingButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = btn.dataset.rating;
        report.rating = value;
        elements.ratingButtons.forEach((b) => {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        logEvent("rating_set", { value: value });
      });
    });
  }

  function bindComment() {
    elements.comment.addEventListener("input", () => {
      // Update preview live so the user sees what they're sharing.
      renderReportPreview();
    });
  }

  function buildIssueUrl() {
    report.comment = elements.comment.value.trim().slice(0, 280);
    const body =
      "Demo feedback from " +
      report.session_id.slice(0, 8) +
      ".\n\n" +
      (report.comment ? "**Comment:** " + report.comment + "\n\n" : "") +
      (report.rating ? "**Rating:** " + report.rating + "\n\n" : "") +
      "---\n\n```json\n" +
      JSON.stringify(report, null, 2) +
      "\n```\n";
    const titleBits = ["Demo feedback"];
    if (report.rating) titleBits.push(report.rating);
    const title = titleBits.join(": ");
    const params = new URLSearchParams();
    params.set("title", title);
    params.set("body", body);
    params.set("labels", "demo-feedback");
    return (
      "https://github.com/" + REPO + "/issues/new?" + params.toString()
    );
  }

  function bindSendGithub() {
    elements.sendGithub.addEventListener("click", () => {
      const url = buildIssueUrl();
      logEvent("send_github_clicked", {
        url_length: url.length,
        rating: report.rating,
        comment_len: elements.comment.value.trim().length,
      });
      // Open in a new tab so the user can review the prefilled issue
      // before clicking Submit on GitHub.
      window.open(url, "_blank", "noopener");
      elements.feedbackStatus.textContent =
        "Opened a prefilled GitHub Issue in a new tab. Review and tap Submit there.";
    });
  }

  function bindDownload() {
    elements.downloadReport.addEventListener("click", () => {
      report.comment = elements.comment.value.trim().slice(0, 280);
      const text = JSON.stringify(report, null, 2);
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "babbled-notes-report-" + report.session_id.slice(0, 8) + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      logEvent("download_report_clicked", {});
      elements.feedbackStatus.textContent =
        "Saved. The file is in your phone's Downloads.";
    });
  }

  // ---------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------

  document.addEventListener("DOMContentLoaded", () => {
    buildPicker();
    selectDemo(0);
    elements.play.addEventListener("click", play);
    elements.stop.addEventListener("click", () => {
      stopPlayback(true);
      elements.status.textContent = "Stopped.";
    });
    if (elements.demoInstrument) {
      elements.demoInstrument.addEventListener("change", () => {
        logEvent("instrument_changed", { value: elements.demoInstrument.value });
      });
    }
    elements.stop.disabled = true;
    bindRating();
    bindComment();
    bindSendGithub();
    bindDownload();
    renderReportPreview();
  });
})();
