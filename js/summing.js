(function () {
  const state = { a1: 0.7, f1: 1, p1: 0, a2: 0.4, f2: 3, p2: 0 };

  function wave(tt, a, f, pDeg) {
    return a * Math.sin(2 * Math.PI * f * tt + (pDeg * Math.PI) / 180);
  }

  // --- One wave's mini circle-and-wave dial (a self-contained copy of
  // Chapter 1's pattern: drag the circle for amplitude/phase, drag the
  // wave itself to stretch it for frequency). ---
  function createWaveDial(canvasId, color, ampKey, freqKey, phaseKey, readoutEl) {
    const canvas = document.getElementById(canvasId);
    const H = 150;
    let cw, ch, ctx;
    function resize() {
      ({ ctx, width: cw, height: ch } = fitCanvas(canvas, H));
    }
    resize();
    window.addEventListener("resize", resize);

    const baseRadius = 45;
    const circleCx = 60;
    const waveStartX = circleCx + baseRadius + 30;
    const speedPxPerSec = 60;

    let t = 0;
    let trace = [];
    function reset() {
      trace = [];
      t = 0;
    }

    function currentAngle() {
      return 2 * Math.PI * state[freqKey] * t + (state[phaseKey] * Math.PI) / 180;
    }
    function dotPosition() {
      const cy = ch / 2;
      const angle = currentAngle();
      const radius = baseRadius * state[ampKey];
      return { x: circleCx + radius * Math.cos(angle), y: cy - radius * Math.sin(angle) };
    }

    const phasorDrag = attachPhasorDrag(canvas, {
      cx: circleCx,
      cy: ch / 2,
      baseRadius,
      getFrequency: () => state[freqKey],
      getT: () => t,
      setAmplitude: (v) => (state[ampKey] = v),
      setPhaseDeg: (v) => (state[phaseKey] = v),
    });

    const freqDrag = attachStretchDrag(canvas, {
      min: 0.2,
      max: 5,
      step: 0.05,
      value: state[freqKey],
      sensitivity: 250,
      region: { x0: waveStartX, y0: 0, x1: Infinity, y1: ch },
      onChange: (v) => {
        state[freqKey] = v;
        readoutEl.textContent = `${v.toFixed(1)} Hz`;
        reset();
      },
    });

    return function draw(dt) {
      const dragging = phasorDrag.isDragging() || freqDrag.isDragging();
      if (!dragging) t += dt;

      const cy = ch / 2;
      const drawX = Math.min(waveStartX + t * speedPxPerSec, cw);
      if (waveStartX + t * speedPxPerSec > cw && !dragging) {
        reset();
        return;
      }

      const dot = dotPosition();
      if (!dragging) trace.push({ x: drawX, y: dot.y });

      ctx.clearRect(0, 0, cw, ch);
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(cw, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(circleCx, cy, baseRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(circleCx, cy);
      ctx.lineTo(dot.x, dot.y);
      ctx.stroke();

      ctx.save();
      ctx.strokeStyle = "#3a4250";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(dot.x, dot.y);
      ctx.lineTo(drawX, dot.y);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      trace.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();

      const handleDragging = phasorDrag.isDragging();
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, handleDragging ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = handleDragging ? "#ffffff" : color;
      ctx.fill();
      ctx.strokeStyle = "#0a0d11";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };
  }

  const drawDialA = createWaveDial(
    "dial-a-canvas",
    COLORS.accent2,
    "a1",
    "f1",
    "p1",
    document.getElementById("freq-a-readout")
  );
  const drawDialB = createWaveDial(
    "dial-b-canvas",
    COLORS.accent3,
    "a2",
    "f2",
    "p2",
    document.getElementById("freq-b-readout")
  );

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

  let lastTs = null;
  loop((ts) => {
    if (lastTs === null) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    drawDialA(dt);
    drawDialB(dt);

    scx.clearRect(0, 0, scw, sch);
    drawGrid(scx, scw, sch);
    drawAxes(scx, scw, sch, {
      yLabel: "Amplitude",
      xLabel: "Time (s) →",
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
