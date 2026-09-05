(function () {
  const canvas = document.getElementById("series-canvas");
  const state = { shape: "square", n: 1 };

  createDragNumber(document.getElementById("dragnum-nterms"), {
    min: 1,
    max: 30,
    step: 1,
    value: state.n,
    label: "Użyte harmoniczne (N)",
    onChange: (v) => (state.n = v),
  });

  document.querySelectorAll("[data-shape]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-shape]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.shape = btn.dataset.shape;
    });
  });

  const updateFormula = liveFormula(document.getElementById("live-formula"));
  function formulaFor(shape, n) {
    const N = `\\textcolor{#f2a65a}{${n}}`;
    if (shape === "square") return `s(t) \\approx \\frac{4}{\\pi}\\sum_{m=1}^{${N}} \\frac{1}{2m-1}\\sin(2\\pi(2m-1)ft)`;
    if (shape === "sawtooth") return `s(t) \\approx \\frac{2}{\\pi}\\sum_{k=1}^{${N}} \\frac{(-1)^{k+1}}{k}\\sin(2\\pi k f t)`;
    return `s(t) \\approx \\frac{8}{\\pi^2}\\sum_{m=1}^{${N}} \\frac{(-1)^{m-1}}{(2m-1)^2}\\sin(2\\pi(2m-1)ft)`;
  }

  const H = 300;
  let cw, ch, ctx;
  function resize() {
    ({ ctx, width: cw, height: ch } = fitCanvas(canvas, H));
  }
  resize();
  window.addEventListener("resize", resize);

  const f = 1;
  const periods = 2;
  const amp = 90;

  // Target (ideal) shapes, period = 1/f, defined on [0,1) then tiled.
  function targetSquare(t) {
    const ph = t * f - Math.floor(t * f);
    return ph < 0.5 ? 1 : -1;
  }
  function targetSawtooth(t) {
    const ph = t * f - Math.floor(t * f);
    return 2 * ph - 1;
  }
  function targetTriangle(t) {
    const ph = t * f - Math.floor(t * f);
    return ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph;
  }

  function approx(t, n, shape) {
    return fourierHarmonics(shape, n).reduce(
      (sum, { k, amp }) => sum + amp * Math.sin(2 * Math.PI * k * f * t),
      0
    );
  }

  function targetFn(shape) {
    if (shape === "square") return targetSquare;
    if (shape === "sawtooth") return targetSawtooth;
    return targetTriangle;
  }

  function plot(fn, color, width, dash) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    for (let x = 0; x <= cw; x++) {
      const t = (x / cw) * (periods / f);
      const y = ch / 2 - fn(t) * amp;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  loop(() => {
    ctx.clearRect(0, 0, cw, ch);
    drawGrid(ctx, cw, ch);
    drawAxes(ctx, cw, ch, {
      yLabel: "Amplituda",
      xLabel: "Czas (s) →",
      xTicks: [
        { x: 4, text: "0", align: "left" },
        { x: cw - 4, text: `${(periods / f).toFixed(0)}s`, align: "right" },
      ],
      yTicks: [{ y: ch / 2, text: "0" }],
    });
    plot(targetFn(state.shape), "#5a6272", 1.5, [5, 4]);
    plot((t) => approx(t, state.n, state.shape), COLORS.accent, 2.5, null);
    updateFormula(formulaFor(state.shape, state.n));
  });
})();
