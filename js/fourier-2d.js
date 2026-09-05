(function () {
  const N = 64;

  function setupPixelCanvas(canvas) {
    canvas.width = N;
    canvas.height = N;
    return canvas.getContext("2d");
  }

  function drawGrayscale(ctx, values) {
    const img = ctx.createImageData(N, N);
    for (let i = 0; i < N * N; i++) {
      const g = Math.round(Math.min(1, Math.max(0, values[i])) * 255);
      img.data[i * 4] = g;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = g;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  // --- 2D sine wave demo ---
  const patternCtx = setupPixelCanvas(document.getElementById("pattern2d-canvas"));
  const uvState = { u: 3, v: 1 };

  function drawPattern2D() {
    const values = new Array(N * N);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const val = Math.cos(2 * Math.PI * ((uvState.u * x) / N + (uvState.v * y) / N));
        values[y * N + x] = (val + 1) / 2;
      }
    }
    drawGrayscale(patternCtx, values);
  }

  createKnob(document.getElementById("knob-u"), {
    min: -8,
    max: 8,
    step: 0.5,
    value: uvState.u,
    label: "u (horizontal)",
    decimals: 1,
    onChange: (v) => {
      uvState.u = v;
      drawPattern2D();
    },
  });
  createKnob(document.getElementById("knob-v"), {
    min: -8,
    max: 8,
    step: 0.5,
    value: uvState.v,
    label: "v (vertical)",
    decimals: 1,
    onChange: (v) => {
      uvState.v = v;
      drawPattern2D();
    },
  });
  drawPattern2D();

  // --- Test patterns ---
  function generatePattern(name) {
    const values = new Array(N * N).fill(0);
    if (name === "checker") {
      const cell = 8;
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++)
          values[y * N + x] = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0 ? 1 : 0;
    } else if (name === "stripes") {
      const cell = 8;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) values[y * N + x] = Math.floor(x / cell) % 2 === 0 ? 1 : 0;
    } else if (name === "circle") {
      const cx = N / 2,
        cy = N / 2,
        r = N / 3.2;
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) values[y * N + x] = Math.hypot(x - cx, y - cy) < r ? 1 : 0;
    } else {
      const off = document.createElement("canvas");
      off.width = N;
      off.height = N;
      const octx = off.getContext("2d");
      octx.fillStyle = "#000";
      octx.fillRect(0, 0, N, N);
      octx.fillStyle = "#fff";
      octx.font = "bold 52px -apple-system, sans-serif";
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.fillText("A", N / 2, N / 2 + 2);
      const data = octx.getImageData(0, 0, N, N).data;
      for (let i = 0; i < N * N; i++) values[i] = data[i * 4] / 255;
    }
    return values;
  }

  // --- Image / spectrum / reconstruction ---
  const imageCtx = setupPixelCanvas(document.getElementById("image-canvas"));
  const spectrumCanvas = document.getElementById("spectrum-canvas");
  const spectrumCtx = setupPixelCanvas(spectrumCanvas);
  const reconCtx = setupPixelCanvas(document.getElementById("reconstructed-canvas"));
  const reconLabel = document.getElementById("reconstructed-label");

  const state = { pattern: "checker", mode: "low", radiusBins: N / 2 };
  let cachedTransform = null; // {re, im} of the current pattern, forward, unmasked

  function foldFreq(i) {
    return i <= N / 2 ? i : i - N;
  }

  function recomputeForward() {
    const values = generatePattern(state.pattern);
    drawGrayscale(imageCtx, values);
    cachedTransform = dft2d(values, N, false);
    drawSpectrum();
    reconstructAndDraw();
  }

  function drawSpectrum() {
    const { re, im } = cachedTransform;
    const mags = new Array(N * N);
    let maxMag = 0;
    for (let i = 0; i < N * N; i++) {
      const m = Math.hypot(re[i], im[i]);
      mags[i] = m;
      if (m > maxMag) maxMag = m;
    }
    const logMax = Math.log(1 + maxMag) || 1;
    const display = new Array(N * N);
    for (let dy = 0; dy < N; dy++) {
      for (let dx = 0; dx < N; dx++) {
        const nx = (dx + N / 2) % N;
        const ny = (dy + N / 2) % N;
        display[dy * N + dx] = Math.log(1 + mags[ny * N + nx]) / logMax;
      }
    }
    drawGrayscale(spectrumCtx, display);
  }

  function reconstructAndDraw() {
    const { re, im } = cachedTransform;
    const maskedRe = new Array(N * N);
    const maskedIm = new Array(N * N);
    for (let ny = 0; ny < N; ny++) {
      const cv = foldFreq(ny);
      for (let nx = 0; nx < N; nx++) {
        const cu = foldFreq(nx);
        const binRadius = Math.hypot(cu, cv);
        const keep = state.mode === "low" ? binRadius <= state.radiusBins : binRadius >= state.radiusBins;
        const idx = ny * N + nx;
        maskedRe[idx] = keep ? re[idx] : 0;
        maskedIm[idx] = keep ? im[idx] : 0;
      }
    }
    const { re: outRe } = dft2d(maskedRe, N, true, maskedIm);
    // High-pass strips the DC/low-frequency "average brightness" term, so the
    // result oscillates around 0 rather than sitting in [0,1] — recenter on
    // mid-gray so edges show as light/dark fluctuations instead of clipping
    // straight to black.
    const display = state.mode === "high" ? outRe.map((v) => v + 0.5) : outRe;
    drawGrayscale(reconCtx, display);
    reconLabel.textContent = `Reconstructed (radius ${state.radiusBins.toFixed(0)})`;
  }

  document.querySelectorAll("[data-pattern]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-pattern]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.pattern = btn.dataset.pattern;
      recomputeForward();
    });
  });
  document.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-mode]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.mode = btn.dataset.mode;
      reconstructAndDraw();
    });
  });

  let dragPending = false;
  attachRadiusDrag(spectrumCanvas, {
    cx: () => spectrumCanvas.clientWidth / 2,
    cy: () => spectrumCanvas.clientHeight / 2,
    max: () => spectrumCanvas.clientWidth / 2,
    onChange: (rPx) => {
      const clientSize = spectrumCanvas.clientWidth || N;
      state.radiusBins = (rPx / clientSize) * N;
      if (!dragPending) {
        dragPending = true;
        requestAnimationFrame(() => {
          dragPending = false;
          reconstructAndDraw();
        });
      }
    },
  });

  recomputeForward();
})();
