(function () {
  const NBINS = 6;
  const f0 = 1;
  const state = { amps: [0.8, 0, 0, 0, 0, 0] };

  const presets = {
    single: [1, 0, 0, 0, 0, 0],
    odd: [1, 0, 0.33, 0, 0.2, 0],
    all: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    none: [0, 0, 0, 0, 0, 0],
  };
  document.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.amps = presets[btn.dataset.preset].slice();
    });
  });

  const timeCanvas = document.getElementById("time-canvas");
  const specCanvas = document.getElementById("spectrum-canvas");
  let tctx, tw, th, sctx, sw, sh;
  function resize() {
    ({ ctx: tctx, width: tw, height: th } = fitCanvas(timeCanvas, 220));
    ({ ctx: sctx, width: sw, height: sh } = fitCanvas(specCanvas, 200));
  }
  resize();
  window.addEventListener("resize", resize);

  const padding = 24;
  function barGeometry() {
    const usable = sw - padding * 2;
    const gap = usable / NBINS;
    return { usable, gap, barW: gap * 0.5, baseline: sh - 25, top: 25 };
  }

  function binIndexAt(x) {
    const { gap } = barGeometry();
    const i = Math.floor((x - padding) / gap);
    return Math.min(NBINS - 1, Math.max(0, i));
  }

  function ampFromY(y) {
    const { baseline, top } = barGeometry();
    return Math.min(1, Math.max(0, (baseline - y) / (baseline - top)));
  }

  let draggingBin = -1;
  specCanvas.addEventListener("pointerdown", (e) => {
    const p = canvasPoint(specCanvas, e);
    draggingBin = binIndexAt(p.x);
    state.amps[draggingBin] = ampFromY(p.y);
    specCanvas.setPointerCapture(e.pointerId);
    specCanvas.style.cursor = "ns-resize";
  });
  specCanvas.addEventListener("pointermove", (e) => {
    const p = canvasPoint(specCanvas, e);
    if (draggingBin === -1) {
      specCanvas.style.cursor = "ns-resize";
      return;
    }
    state.amps[draggingBin] = ampFromY(p.y);
  });
  function endDrag() {
    draggingBin = -1;
    specCanvas.style.cursor = "ns-resize";
  }
  specCanvas.addEventListener("pointerup", endDrag);
  specCanvas.addEventListener("pointercancel", endDrag);
  specCanvas.addEventListener("lostpointercapture", endDrag);
  window.addEventListener("pointerup", endDrag);

  function signal(t) {
    let s = 0;
    for (let i = 0; i < NBINS; i++) s += state.amps[i] * Math.sin(2 * Math.PI * (i + 1) * f0 * t);
    return s;
  }

  function drawTime() {
    tctx.clearRect(0, 0, tw, th);
    drawGrid(tctx, tw, th);
    const windowSeconds = 2 / f0;
    const scale = (th * 0.4) / Math.max(1, NBINS * 0.5);
    drawAxes(tctx, tw, th, {
      yLabel: "Ampiezza",
      xLabel: "Tempo (s) →",
      xTicks: [
        { x: 4, text: "0", align: "left" },
        { x: tw - 4, text: `${windowSeconds}s`, align: "right" },
      ],
      yTicks: [{ y: th / 2, text: "0" }],
    });
    tctx.strokeStyle = COLORS.accent;
    tctx.lineWidth = 2.5;
    tctx.beginPath();
    for (let x = 0; x <= tw; x++) {
      const t = (x / tw) * windowSeconds;
      const y = th / 2 - signal(t) * scale;
      x === 0 ? tctx.moveTo(x, y) : tctx.lineTo(x, y);
    }
    tctx.stroke();
  }

  function drawSpectrum() {
    sctx.clearRect(0, 0, sw, sh);
    const { gap, barW, baseline } = barGeometry();
    drawAxes(sctx, sw, sh, { yLabel: "Ampiezza" });
    sctx.strokeStyle = COLORS.grid;
    sctx.beginPath();
    sctx.moveTo(padding, baseline + 0.5);
    sctx.lineTo(sw - 10, baseline + 0.5);
    sctx.stroke();
    for (let i = 0; i < NBINS; i++) {
      const cx = padding + gap * i + gap / 2;
      const barH = state.amps[i] * (baseline - 25);
      sctx.fillStyle = i === draggingBin ? "#ffffff" : COLORS.accent2;
      sctx.fillRect(cx - barW / 2, baseline - barH, barW, Math.max(barH, 2));
      sctx.fillStyle = COLORS.text;
      sctx.font = "11px -apple-system, sans-serif";
      sctx.textAlign = "center";
      sctx.fillText(`${i + 1}f₀`, cx, sh - 8);
    }
  }

  const updateFormula = liveFormula(document.getElementById("live-formula"));
  function formulaFor(amps) {
    const terms = amps
      .map((a, i) => (a > 0.005 ? `\\textcolor{#f2a65a}{${a.toFixed(2)}}\\sin(2\\pi \\cdot ${i + 1} f_0 t)` : null))
      .filter(Boolean);
    return terms.length ? `y(t) = ${terms.join(" + ")}` : "y(t) = 0";
  }

  loop(() => {
    drawTime();
    drawSpectrum();
    updateFormula(formulaFor(state.amps));
  });
})();
