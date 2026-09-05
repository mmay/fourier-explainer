(function () {
  const state = { a1: 0.7, f1: 1, p1: 0, a2: 0.4, f2: 3, p2: 0 };
  let t = 0;
  let lastTs = null;

  function wave(tt, a, f, pDeg) {
    return a * Math.sin(2 * Math.PI * f * tt + (pDeg * Math.PI) / 180);
  }

  // --- Two independent draggable phasor dials (Wave A, Wave B) ---
  function setupDial(canvasId, color, ampKey, freqKey, phaseKey) {
    const canvas = document.getElementById(canvasId);
    const SIZE = 140;
    let ctx, cw, ch;
    function resize() {
      ({ ctx, width: cw, height: ch } = fitCanvas(canvas, SIZE));
    }
    resize();
    window.addEventListener("resize", resize);

    const cx = SIZE / 2,
      cy = SIZE / 2;
    const baseRadius = 50;

    const drag = attachPhasorDrag(canvas, {
      cx,
      cy,
      baseRadius,
      getFrequency: () => state[freqKey],
      getT: () => t,
      setAmplitude: (v) => (state[ampKey] = v),
      setPhaseDeg: (v) => (state[phaseKey] = v),
    });

    return function draw() {
      const angle = 2 * Math.PI * state[freqKey] * t + (state[phaseKey] * Math.PI) / 180;
      const radius = baseRadius * state[ampKey];
      const px = cx + radius * Math.cos(angle);
      const py = cy - radius * Math.sin(angle);

      ctx.clearRect(0, 0, cw, ch);
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(cw, cy);
      ctx.stroke();

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(px, py);
      ctx.stroke();

      const dragging = drag.isDragging();
      ctx.beginPath();
      ctx.arc(px, py, dragging ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = dragging ? "#ffffff" : color;
      ctx.fill();
      ctx.strokeStyle = "#0a0d11";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };
  }

  const drawDialA = setupDial("dial-a-canvas", COLORS.accent2, "a1", "f1", "p1");
  const drawDialB = setupDial("dial-b-canvas", COLORS.accent3, "a2", "f2", "p2");

  createKnob(document.getElementById("knob-freq-a"), {
    min: 0.2,
    max: 5,
    step: 0.1,
    value: state.f1,
    label: "Frequenza",
    unit: " Hz",
    decimals: 1,
    onChange: (v) => (state.f1 = v),
  });
  createKnob(document.getElementById("knob-freq-b"), {
    min: 0.2,
    max: 5,
    step: 0.1,
    value: state.f2,
    label: "Frequenza",
    unit: " Hz",
    decimals: 1,
    onChange: (v) => (state.f2 = v),
  });

  // --- Combined sum-wave chart (full-window static plot, live values) ---
  const sumCanvas = document.getElementById("sum-canvas");
  let scx, scw, sch;
  function resizeSum() {
    ({ ctx: scx, width: scw, height: sch } = fitCanvas(sumCanvas, 260));
  }
  resizeSum();
  window.addEventListener("resize", resizeSum);

  const windowSeconds = 4;
  const pxPerUnit = 70;

  function plot(fn, color, width) {
    scx.strokeStyle = color;
    scx.lineWidth = width;
    scx.beginPath();
    for (let x = 0; x <= scw; x++) {
      const tt = (x / scw) * windowSeconds;
      const y = sch / 2 - fn(tt) * pxPerUnit;
      x === 0 ? scx.moveTo(x, y) : scx.lineTo(x, y);
    }
    scx.stroke();
  }

  const updateFormula = liveFormula(document.getElementById("live-formula"));

  loop((ts) => {
    if (lastTs === null) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    t += dt;

    drawDialA();
    drawDialB();

    scx.clearRect(0, 0, scw, sch);
    drawGrid(scx, scw, sch);
    drawAxes(scx, scw, sch, {
      yLabel: "Ampiezza",
      xLabel: "Tempo (s) →",
      xTicks: [
        { x: 4, text: "0", align: "left" },
        { x: scw - 4, text: `${windowSeconds}s`, align: "right" },
      ],
      yTicks: [{ y: sch / 2, text: "0" }],
    });
    plot((tt) => wave(tt, state.a1, state.f1, state.p1), COLORS.accent2, 1.5);
    plot((tt) => wave(tt, state.a2, state.f2, state.p2), COLORS.accent3, 1.5);
    plot((tt) => wave(tt, state.a1, state.f1, state.p1) + wave(tt, state.a2, state.f2, state.p2), COLORS.accent, 2.5);

    updateFormula(
      `y(t) = \\textcolor{#f2a65a}{${state.a1.toFixed(2)}} \\sin(2\\pi \\cdot \\textcolor{#f2a65a}{${state.f1.toFixed(
        1
      )}} \\cdot t + \\textcolor{#f2a65a}{${Math.round(state.p1)}^\\circ}) + \\textcolor{#7ee787}{${state.a2.toFixed(
        2
      )}} \\sin(2\\pi \\cdot \\textcolor{#7ee787}{${state.f2.toFixed(1)}} \\cdot t + \\textcolor{#7ee787}{${Math.round(
        state.p2
      )}^\\circ})`
    );
  });
})();
