(function () {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const elements = {
    arm: document.getElementById("voice-arm"),
    record: document.getElementById("record"),
    stop: document.getElementById("record-stop"),
    status: document.getElementById("record-status"),
  };

  if (!elements.arm || !elements.record || !elements.stop) return;

  let recognition = null;
  let armed = false;
  let restarting = false;

  function setStatus(text) {
    if (elements.status) elements.status.textContent = text;
  }

  function setArmed(next) {
    armed = next;
    elements.arm.setAttribute("aria-pressed", armed ? "true" : "false");
    elements.arm.textContent = armed ? "Voice on" : "Voice start";
  }

  function setupRecognition() {
    if (!SpeechRecognition) {
      setStatus("Voice start is not available in this browser. Use Record and Stop.");
      return null;
    }

    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.addEventListener("result", (event) => {
      const latest = event.results[event.results.length - 1];
      const phrase = latest && latest[0] ? latest[0].transcript.toLowerCase() : "";
      handlePhrase(phrase);
    });

    rec.addEventListener("end", () => {
      if (!armed || restarting) return;
      try {
        rec.start();
      } catch (_) {
        setStatus("Voice start paused. Tap Voice start again if you need it.");
        setArmed(false);
      }
    });

    rec.addEventListener("error", () => {
      setStatus("Voice start could not hear a command. Use Record and Stop if needed.");
    });

    return rec;
  }

  function handlePhrase(phrase) {
    if (!phrase) return;
    if (/\b(stop|done|finish|off)\b/.test(phrase)) {
      elements.stop.click();
      setStatus('Voice command heard: stop recording.');
      return;
    }
    if (/\b(start|record|listen|on)\b/.test(phrase)) {
      elements.record.click();
      setStatus('Voice command heard: start recording.');
    }
  }

  function toggleVoiceControl() {
    if (armed) {
      setArmed(false);
      restarting = true;
      try { recognition && recognition.stop(); } catch (_) {}
      restarting = false;
      setStatus("Voice start is off.");
      return;
    }

    recognition = recognition || setupRecognition();
    if (!recognition) return;

    try {
      recognition.start();
      setArmed(true);
      setStatus('Voice start is on. Say "start recording" or "stop recording."');
    } catch (_) {
      setStatus("Voice start is already listening.");
      setArmed(true);
    }
  }

  elements.arm.addEventListener("click", toggleVoiceControl);
})();
