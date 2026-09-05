(function () {
  const canvas = document.getElementById("epi-canvas");
  const state = { shape: "square", n: 4, speed: 0.4 };

  createDragNumber(document.getElementById("dragnum-epi-n"), {
    min: 1,
    max: 25,
    step: 1,
    value: state.n,
    label: "Okręgi (harmoniczne)",
    onChange: (v) => (state.n = v),
  });
  createKnob(document.getElementById("knob-epi-speed"), {
    min: 0.1,
    max: 2,
    step: 0.05,
    value: state.speed,
    label: "Prędkość",
    unit: "×",
    decimals: 2,
    onChange: (v) => (state.speed = v),
  });

  const updateFormula = liveFormula(document.getElementById("live-formula"));
  function formulaFor(shape, n) {
    const N = `\\textcolor{#f2a65a}{${n}}`;
    if (shape === "square") return `s(t) \\approx \\frac{4}{\\pi}\\sum_{m=1}^{${N}} \\frac{1}{2m-1}\\sin(2\\pi(2m-1)ft)`;
    if (shape === "sawtooth") return `s(t) \\approx \\frac{2}{\\pi}\\sum_{k=1}^{${N}} \\frac{(-1)^{k+1}}{k}\\sin(2\\pi k f t)`;
    return `s(t) \\approx \\frac{8}{\\pi^2}\\sum_{m=1}^{${N}} \\frac{(-1)^{m-1}}{(2m-1)^2}\\sin(2\\pi(2m-1)ft)`;
  }

  document.querySelectorAll("[data-shape]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-shape]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.shape = btn.dataset.shape;
      reset();
    });
  });

  const H = 320;
  let cw, ch, ctx;
  function resize() {
    ({ ctx, width: cw, height: ch } = fitCanvas(canvas, H));
  }
  resize();
  window.addEventListener("resize", resize);

  const f = 1;
  const ampScale = 45;
  const baseCx = 140;
  const waveStartX = 340;
  const speedPxPerSec = 70;

  let t = 0;
  let trace = [];
  function reset() {
    trace = [];
    t = 0;
  }

  let lastTs = null;
  loop((ts) => {
    if (lastTs === null) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    t += dt * state.speed;

    const cy = ch / 2;
    const drawX = waveStartX + t * speedPxPerSec * state.speed;
    if (drawX > cw) {
      reset();
      return;
    }

    const terms = fourierHarmonics(state.shape, state.n);

    ctx.clearRect(0, 0, cw, ch);
    drawGrid(ctx, cw, ch, { midY: cy });
    drawAxes(ctx, cw, ch, {
      yLabel: "Amplituda",
      xLabel: "Czas →",
      xTicks: [
        { x: waveStartX, text: "0", align: "left" },
        { x: cw - 4, text: `${((cw - waveStartX) / speedPxPerSec).toFixed(1)}s`, align: "right" },
      ],
      yTicks: [{ y: cy, text: "0" }],
    });

    let cx = baseCx,
      cyPos = cy;
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    terms.forEach(({ k, amp }) => {
      const angle = 2 * Math.PI * k * f * t;
      const r = amp * ampScale;
      const nx = cx + r * Math.cos(angle);
      const ny = cyPos - r * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(cx, cyPos, Math.abs(r), 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cyPos);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      cx = nx;
      cyPos = ny;
    });

    ctx.fillStyle = COLORS.accent2;
    ctx.beginPath();
    ctx.arc(cx, cyPos, 4, 0, Math.PI * 2);
    ctx.fill();

    trace.push({ x: drawX, y: cyPos });

    ctx.save();
    ctx.strokeStyle = "#3a4250";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cyPos);
    ctx.lineTo(drawX, cyPos);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = COLORS.accent2;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    trace.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();

    updateFormula(formulaFor(state.shape, state.n));
  });
})();
