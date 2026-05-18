(function () {
  const canvas = document.getElementById("neural-backdrop");
  if (!canvas) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = canvas.getContext("2d");
  const nodes = [];
  let width = 0;
  let height = 0;

  function resize() {
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    seed();
    draw();
  }

  function seed() {
    nodes.length = 0;
    const count = Math.max(18, Math.min(44, Math.floor((width * height) / 28000)));
    for (let i = 0; i < count; i += 1) {
      nodes.push({
        x: (width * ((i * 37) % count)) / count + (i % 3) * 18,
        y: (height * ((i * 19) % count)) / count + (i % 5) * 12,
        vx: ((i % 5) - 2) * 0.08,
        vy: (((i + 2) % 5) - 2) * 0.07,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const line = isDark ? "rgba(99, 199, 188, 0.18)" : "rgba(24, 106, 104, 0.16)";
    const dot = isDark ? "rgba(240, 123, 77, 0.42)" : "rgba(167, 53, 21, 0.32)";

    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 150) {
          ctx.strokeStyle = line;
          ctx.lineWidth = 1 - distance / 170;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    nodes.forEach((node) => {
      ctx.fillStyle = dot;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function tick() {
    nodes.forEach((node) => {
      node.x += node.vx;
      node.y += node.vy;
      if (node.x < -20) node.x = width + 20;
      if (node.x > width + 20) node.x = -20;
      if (node.y < -20) node.y = height + 20;
      if (node.y > height + 20) node.y = -20;
    });
    draw();
    if (!reduceMotion) window.requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  resize();
  if (!reduceMotion) tick();
})();
