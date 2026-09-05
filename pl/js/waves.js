(function () {
  const canvas = document.getElementById("wave-canvas");
  const state = { amplitude: 0.75, frequency: 1, phaseDeg: 0 };

  createKnob(document.getElementById("knob-frequency"), {
    min: 0.2,
    max: 3,
    step: 0.01,
    value: state.frequency,
    label: "Częstotliwość (f)",
    unit: " Hz",
    decimals: 2,
    onChange: (v) => {
      state.frequency = v;
      reset();
    },
  });

  const H = 260;
  let cw, ch, ctx;
  function resize() {
    ({ ctx, width: cw, height: ch } = fitCanvas(canvas, H));
  }
  resize();
  window.addEventListener("resize", resize);

  const baseRadius = 80;
  const circleCx = 110;
  const speedPxPerSec = 90;
  let t = 0;
  let trace = [];
  let lastTs = null;

  function reset() {
    trace = [];
    t = 0;
  }

  function currentAngle() {
    return 2 * Math.PI * state.frequency * t + (state.phaseDeg * Math.PI) / 180;
  }

  function dotPosition() {
    const cy = ch / 2;
    const angle = currentAngle();
    const radius = baseRadius * state.amplitude;
    return { x: circleCx + radius * Math.cos(angle), y: cy - radius * Math.sin(angle) };
  }

  const phasorDrag = attachPhasorDrag(canvas, {
    cx: circleCx,
    cy: ch / 2,
    baseRadius,
    getFrequency: () => state.frequency,
    getT: () => t,
    setAmplitude: (v) => (state.amplitude = v),
    setPhaseDeg: (v) => (state.phaseDeg = v),
  });

  const updateFormula = liveFormula(document.getElementById("live-formula"));

  loop((ts) => {
    if (lastTs === null) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    const dragging = phasorDrag.isDragging();
    if (!dragging) t += dt;

    const cy = ch / 2;
    const waveStartX = circleCx + baseRadius + 50;
    const drawX = Math.min(waveStartX + t * speedPxPerSec, cw);
    if (waveStartX + t * speedPxPerSec > cw && !dragging) {
      reset();
      return;
    }

    const dot = dotPosition();
    if (!dragging) trace.push({ x: drawX, y: dot.y });

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

    ctx.strokeStyle = COLORS.grid;
    ctx.beginPath();
    ctx.arc(circleCx, cy, baseRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = COLORS.accent;
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

    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    trace.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.fillStyle = COLORS.accent;
    ctx.beginPath();
    ctx.arc(drawX, dot.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draggable handle: bigger halo so it reads as grabbable, brighter while dragging.
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dragging ? 9 : 7, 0, Math.PI * 2);
    ctx.fillStyle = dragging ? "#ffffff" : COLORS.accent;
    ctx.fill();
    ctx.strokeStyle = "#0a0d11";
    ctx.lineWidth = 2;
    ctx.stroke();

    updateFormula(
      `y(t) = \\textcolor{#f2a65a}{${state.amplitude.toFixed(2)}} \\sin(2\\pi \\cdot \\textcolor{#f2a65a}{${state.frequency.toFixed(
        2
      )}} \\cdot t + \\textcolor{#f2a65a}{${Math.round(state.phaseDeg)}^\\circ})`
    );
  });
})();
