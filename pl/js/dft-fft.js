(function () {
  const NBINS = 4;
  const f0 = 1;
  const state = { amps: [1, 0, 0.33, 0], n: 64 };

  createDragNumber(document.getElementById("dragnum-dft-n"), {
    min: 16,
    max: 128,
    step: 8,
    value: state.n,
    label: "Pobrane próbki (N)",
    onChange: (v) => (state.n = v),
  });

  const timeCanvas = document.getElementById("dft-time-canvas");
  const inputCanvas = document.getElementById("dft-input-canvas");
  const specCanvas = document.getElementById("dft-spectrum-canvas");
  let tctx, tw, th, ictx, iw, ih, sctx, sw, sh;
  function resize() {
    ({ ctx: tctx, width: tw, height: th } = fitCanvas(timeCanvas, 220));
    ({ ctx: ictx, width: iw, height: ih } = fitCanvas(inputCanvas, 120));
    ({ ctx: sctx, width: sw, height: sh } = fitCanvas(specCanvas, 200));
  }
  resize();
  window.addEventListener("resize", resize);

  // --- Draggable input bars (design the signal) ---
  const padding = 24;
  function inputBarGeometry() {
    const usable = iw - padding * 2;
    const gap = usable / NBINS;
    return { gap, barW: gap * 0.5, baseline: ih - 22, top: 14 };
  }
  function binIndexAt(x) {
    const { gap } = inputBarGeometry();
    return Math.min(NBINS - 1, Math.max(0, Math.floor((x - padding) / gap)));
  }
  function ampFromY(y) {
    const { baseline, top } = inputBarGeometry();
    return Math.min(1, Math.max(0, (baseline - y) / (baseline - top)));
  }
  let draggingBin = -1;
  inputCanvas.addEventListener("pointerdown", (e) => {
    const p = canvasPoint(inputCanvas, e);
    draggingBin = binIndexAt(p.x);
    state.amps[draggingBin] = ampFromY(p.y);
    inputCanvas.setPointerCapture(e.pointerId);
    inputCanvas.style.cursor = "ns-resize";
  });
  inputCanvas.addEventListener("pointermove", (e) => {
    inputCanvas.style.cursor = "ns-resize";
    if (draggingBin === -1) return;
    state.amps[draggingBin] = ampFromY(canvasPoint(inputCanvas, e).y);
  });
  function endDrag() {
    draggingBin = -1;
    inputCanvas.style.cursor = "ns-resize";
  }
  inputCanvas.addEventListener("pointerup", endDrag);
  inputCanvas.addEventListener("pointercancel", endDrag);
  inputCanvas.addEventListener("lostpointercapture", endDrag);
  window.addEventListener("pointerup", endDrag);

  function drawInputBars() {
    ictx.clearRect(0, 0, iw, ih);
    const { gap, barW, baseline } = inputBarGeometry();
    drawAxes(ictx, iw, ih, { yLabel: "Amplituda" });
    ictx.strokeStyle = COLORS.grid;
    ictx.beginPath();
    ictx.moveTo(padding, baseline + 0.5);
    ictx.lineTo(iw - 10, baseline + 0.5);
    ictx.stroke();
    for (let i = 0; i < NBINS; i++) {
      const cx = padding + gap * i + gap / 2;
      const barH = state.amps[i] * (baseline - 14);
      ictx.fillStyle = i === draggingBin ? "#ffffff" : COLORS.accent;
      ictx.fillRect(cx - barW / 2, baseline - barH, barW, Math.max(barH, 2));
      ictx.fillStyle = COLORS.text;
      ictx.font = "11px -apple-system, sans-serif";
      ictx.textAlign = "center";
      ictx.fillText(`${i + 1}f₀`, cx, ih - 6);
    }
  }

  function signal(t) {
    let s = 0;
    for (let i = 0; i < NBINS; i++) s += state.amps[i] * Math.sin(2 * Math.PI * (i + 1) * f0 * t);
    return s;
  }

  function drawTime() {
    tctx.clearRect(0, 0, tw, th);
    drawGrid(tctx, tw, th);
    const period = 1 / f0;
    const scale = 60;
    drawAxes(tctx, tw, th, {
      yLabel: "Amplituda",
      xLabel: "Czas (s) →",
      xTicks: [
        { x: 4, text: "0", align: "left" },
        { x: tw - 4, text: `${period}s`, align: "right" },
      ],
      yTicks: [{ y: th / 2, text: "0" }],
    });

    tctx.strokeStyle = "#5a6272";
    tctx.lineWidth = 1.2;
    tctx.beginPath();
    for (let x = 0; x <= tw; x++) {
      const t = (x / tw) * period;
      const y = th / 2 - signal(t) * scale;
      x === 0 ? tctx.moveTo(x, y) : tctx.lineTo(x, y);
    }
    tctx.stroke();

    const N = state.n;
    const dt = period / N;
    tctx.fillStyle = COLORS.accent;
    for (let n = 0; n < N; n++) {
      const t = n * dt;
      const x = (t / period) * tw;
      const y = th / 2 - signal(t) * scale;
      tctx.beginPath();
      tctx.arc(x, y, 2.5, 0, Math.PI * 2);
      tctx.fill();
    }
  }

  function computeDFT(samples) {
    const N = samples.length;
    const half = Math.floor(N / 2);
    const mags = new Array(half + 1);
    for (let k = 0; k <= half; k++) {
      let re = 0,
        im = 0;
      for (let n = 0; n < N; n++) {
        const angle = (2 * Math.PI * k * n) / N;
        re += samples[n] * Math.cos(angle);
        im -= samples[n] * Math.sin(angle);
      }
      const mag = Math.sqrt(re * re + im * im);
      mags[k] = (k === 0 ? 1 / N : 2 / N) * mag;
    }
    return mags;
  }

  function drawSpectrum() {
    const N = state.n;
    const period = 1 / f0;
    const dt = period / N;
    const samples = [];
    for (let n = 0; n < N; n++) samples.push(signal(n * dt));
    const mags = computeDFT(samples);

    sctx.clearRect(0, 0, sw, sh);
    const padding = 24;
    const usable = sw - padding * 2;
    const barGap = usable / mags.length;
    const barW = Math.max(1, barGap * 0.7);

    drawAxes(sctx, sw, sh, { yLabel: "|Xₖ|" });
    sctx.strokeStyle = COLORS.grid;
    sctx.beginPath();
    sctx.moveTo(padding, sh - 30.5);
    sctx.lineTo(sw - 10, sh - 30.5);
    sctx.stroke();

    const labelEvery = Math.ceil(mags.length / 16);
    mags.forEach((m, k) => {
      const cx = padding + barGap * k + barGap / 2;
      const barH = m * (sh - 60);
      sctx.fillStyle = k >= 1 && k <= NBINS ? COLORS.accent2 : "#3a4250";
      sctx.fillRect(cx - barW / 2, sh - 31 - barH, barW, barH);
      if (k % labelEvery === 0) {
        sctx.fillStyle = COLORS.text;
        sctx.font = "10px -apple-system, sans-serif";
        sctx.textAlign = "center";
        sctx.fillText(`${k}`, cx, sh - 14);
      }
    });
    sctx.fillStyle = COLORS.text;
    sctx.font = "11px -apple-system, sans-serif";
    sctx.textAlign = "left";
    sctx.fillText("k (indeks częstotliwości, w wielokrotnościach f₀)", padding, sh - 2);
  }

  loop(() => {
    drawInputBars();
    drawTime();
    drawSpectrum();
  });

  // Complexity comparison table (computed, not hand-typed).
  const tbody = document.getElementById("complexity-table");
  const ns = [8, 16, 32, 64, 128, 256, 1024, 1048576];
  const fmt = (x) => x.toLocaleString("en-US", { maximumFractionDigits: 1 });
  tbody.innerHTML = ns
    .map((N) => {
      const dftOps = N * N;
      const fftOps = N * Math.log2(N);
      const speedup = dftOps / fftOps;
      return `<tr style="border-bottom:1px solid var(--border); text-align:right;">
        <td style="text-align:left; padding:0.4rem 0.6rem;">${fmt(N)}</td>
        <td style="padding:0.4rem 0.6rem;">${fmt(dftOps)}</td>
        <td style="padding:0.4rem 0.6rem;">${fmt(fftOps)}</td>
        <td style="padding:0.4rem 0.6rem; color: var(--accent);">${fmt(speedup)}&times;</td>
      </tr>`;
    })
    .join("");
})();
