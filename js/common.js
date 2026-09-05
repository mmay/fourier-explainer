// Shared helpers used by every chapter's visualization script.

function fitCanvas(canvas, cssHeight) {
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || canvas.parentElement.clientWidth;
  canvas.style.height = cssHeight + "px";
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: cssWidth, height: cssHeight };
}

// A rotary knob: drag vertically (or scroll) to change value. Used for
// anything angle- or rate-like (frequency, phase, speed) — turning a dial
// to change a rate reads more naturally than dragging a horizontal bar.
function createKnob(container, opts) {
  const { min, max, step = 0.01, label = "", unit = "", decimals = 2, format, sensitivity = 150, onChange } = opts;
  let value = opts.value;
  const r = 24;
  const C = 2 * Math.PI * r;
  const trackLen = C * (270 / 360);

  container.classList.add("knob-widget");
  container.innerHTML = `
    <svg viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="${r}" class="knob-track" stroke-dasharray="${trackLen} ${C - trackLen}" transform="rotate(135 32 32)"></circle>
      <circle cx="32" cy="32" r="${r}" class="knob-arc" stroke-dasharray="0 ${C}" transform="rotate(135 32 32)"></circle>
      <circle cx="32" cy="32" r="15" class="knob-cap"></circle>
      <line x1="32" y1="32" x2="32" y2="14" class="knob-pointer"></line>
    </svg>
    <div class="knob-label">${label}</div>
    <div class="knob-value"></div>
  `;
  const svg = container.querySelector("svg");
  const arc = container.querySelector(".knob-arc");
  const pointer = container.querySelector(".knob-pointer");
  const valueEl = container.querySelector(".knob-value");

  function render() {
    const frac = (value - min) / (max - min);
    pointer.style.transform = `rotate(${-135 + frac * 270}deg)`;
    arc.setAttribute("stroke-dasharray", `${trackLen * frac} ${C - trackLen * frac}`);
    valueEl.textContent = format ? format(value) : `${value.toFixed(decimals)}${unit}`;
  }

  function setValue(v, fire) {
    v = Math.round(v / step) * step;
    value = Math.min(max, Math.max(min, v));
    render();
    if (fire && onChange) onChange(value);
  }

  let dragging = false,
    startY = 0,
    startVal = 0;
  const pxPerUnit = sensitivity / (max - min);
  svg.addEventListener("pointerdown", (e) => {
    dragging = true;
    startY = e.clientY;
    startVal = value;
    svg.setPointerCapture(e.pointerId);
    svg.classList.add("dragging");
  });
  svg.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    setValue(startVal + (startY - e.clientY) / pxPerUnit, true);
  });
  const endDrag = () => {
    dragging = false;
    svg.classList.remove("dragging");
  };
  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);
  svg.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      setValue(value + (e.deltaY < 0 ? step : -step) * 5, true);
    },
    { passive: false }
  );

  render();
  return {
    setValue: (v) => setValue(v, false),
    getValue: () => value,
  };
}

// A big number you drag vertically (or click the +/- steppers) to change —
// for discrete counts (harmonics, samples) where a knob or slider both feel
// like overkill for "pick an integer."
function createDragNumber(container, opts) {
  const { min, max, step = 1, label = "", unit = "", onChange } = opts;
  let value = opts.value;

  container.classList.add("dragnum");
  container.innerHTML = `
    <div class="dragnum-label">${label}</div>
    <div class="dragnum-display">
      <button type="button" class="dragnum-btn" data-dec>&minus;</button>
      <div class="dragnum-value"></div>
      <button type="button" class="dragnum-btn" data-inc>+</button>
    </div>
  `;
  const valueEl = container.querySelector(".dragnum-value");

  function render() {
    valueEl.textContent = `${value}${unit}`;
  }
  function setValue(v, fire) {
    value = Math.min(max, Math.max(min, Math.round(v / step) * step));
    render();
    if (fire && onChange) onChange(value);
  }

  container.querySelector("[data-dec]").addEventListener("click", () => setValue(value - step, true));
  container.querySelector("[data-inc]").addEventListener("click", () => setValue(value + step, true));

  let dragging = false,
    startY = 0,
    startVal = 0;
  valueEl.addEventListener("pointerdown", (e) => {
    dragging = true;
    startY = e.clientY;
    startVal = value;
    valueEl.setPointerCapture(e.pointerId);
    valueEl.classList.add("dragging");
  });
  valueEl.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    setValue(startVal + Math.round((startY - e.clientY) / 6) * step, true);
  });
  const endDrag = () => {
    dragging = false;
    valueEl.classList.remove("dragging");
  };
  valueEl.addEventListener("pointerup", endDrag);
  valueEl.addEventListener("pointercancel", endDrag);
  valueEl.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      setValue(value + (e.deltaY < 0 ? step : -step), true);
    },
    { passive: false }
  );

  render();
  return {
    setValue: (v) => setValue(v, false),
    getValue: () => value,
  };
}

// Wires up a "phasor dial" drag interaction on a canvas: click anywhere
// within (a little past) the circle and the arm snaps to point at the
// cursor, setting amplitude (distance from center) and phase (angle,
// relative to the arm's current animated position). Grabbing the whole
// circle rather than the moving tip is what makes this easy to grab.
function attachPhasorDrag(canvas, opts) {
  const { cx, cy, baseRadius, getFrequency, getT, setAmplitude, setPhaseDeg, grabSlack = 1.25 } = opts;
  let dragging = false;
  const grabRadius = baseRadius * grabSlack;

  function apply(p) {
    const dx = p.x - cx,
      dy = cy - p.y;
    const angle = Math.atan2(dy, dx);
    const radius = Math.min(baseRadius, Math.max(baseRadius * 0.15, Math.hypot(dx, dy)));
    setAmplitude(radius / baseRadius);
    let phaseDeg = ((angle - 2 * Math.PI * getFrequency() * getT()) * 180) / Math.PI;
    phaseDeg %= 360;
    if (phaseDeg < 0) phaseDeg += 360;
    setPhaseDeg(phaseDeg);
  }

  canvas.addEventListener("pointerdown", (e) => {
    const p = canvasPoint(canvas, e);
    if (Math.hypot(p.x - cx, p.y - cy) <= grabRadius) {
      dragging = true;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
      apply(p);
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    const p = canvasPoint(canvas, e);
    if (!dragging) {
      canvas.style.cursor = Math.hypot(p.x - cx, p.y - cy) <= grabRadius ? "grab" : "default";
      return;
    }
    apply(p);
  });
  const endDrag = () => {
    dragging = false;
    canvas.style.cursor = "default";
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("lostpointercapture", endDrag);
  window.addEventListener("pointerup", endDrag);
  return { isDragging: () => dragging };
}

// Wires up a simple radius-drag on a canvas: click/drag anywhere and the
// handle snaps to the cursor's distance from a fixed center (no angle) —
// used for the low/high-pass filter cutoff circle in the 2D FFT chapter.
function attachRadiusDrag(canvas, opts) {
  const { cx, cy, min = 0, max, onChange } = opts;
  const resolve = (v) => (typeof v === "function" ? v() : v);
  let dragging = false;

  function apply(p) {
    const r = Math.min(resolve(max), Math.max(min, Math.hypot(p.x - resolve(cx), p.y - resolve(cy))));
    onChange(r);
  }

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "ew-resize";
    apply(canvasPoint(canvas, e));
  });
  canvas.addEventListener("pointermove", (e) => {
    canvas.style.cursor = "ew-resize";
    if (!dragging) return;
    apply(canvasPoint(canvas, e));
  });
  const endDrag = () => {
    dragging = false;
    canvas.style.cursor = "ew-resize";
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("lostpointercapture", endDrag);
  window.addEventListener("pointerup", endDrag);
  return { isDragging: () => dragging };
}

// Drag directly on a canvas region to set a value — horizontal motion maps
// linearly to the value, like grabbing and stretching the thing you're
// looking at rather than turning a separate dial. `region` ({x0,y0,x1,y1}
// in CSS px) scopes where the drag can start, so this can coexist with
// other drag handlers (e.g. attachPhasorDrag) on the same canvas; omit it
// to make the whole canvas the target.
function attachStretchDrag(canvas, opts) {
  const { min, max, step = 0.01, sensitivity = 200, region, onChange } = opts;
  let value = opts.value;
  let dragging = false,
    startX = 0,
    startVal = 0;
  const pxPerUnit = sensitivity / (max - min);

  function inRegion(p) {
    if (!region) return true;
    return p.x >= region.x0 && p.x <= region.x1 && p.y >= region.y0 && p.y <= region.y1;
  }

  function setValue(v, fire) {
    v = Math.round(v / step) * step;
    value = Math.min(max, Math.max(min, v));
    if (fire && onChange) onChange(value);
  }

  canvas.addEventListener("pointerdown", (e) => {
    const p = canvasPoint(canvas, e);
    if (!inRegion(p)) return;
    dragging = true;
    startX = p.x;
    startVal = value;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "ew-resize";
  });
  canvas.addEventListener("pointermove", (e) => {
    const p = canvasPoint(canvas, e);
    if (!dragging) {
      if (inRegion(p)) canvas.style.cursor = "ew-resize";
      return;
    }
    setValue(startVal + (p.x - startX) / pxPerUnit, true);
  });
  const endDrag = () => {
    dragging = false;
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("lostpointercapture", endDrag);
  window.addEventListener("pointerup", endDrag);
  return {
    isDragging: () => dragging,
    getValue: () => value,
    setValue: (v) => setValue(v, false),
  };
}

// 1D complex DFT (direct O(N^2), matching Chapter 7's own choice to compute
// the real formula rather than a true FFT). inverse=true divides by N and
// flips the exponent sign. re/im are plain arrays of the same length.
function dft1d(re, im, inverse) {
  const N = re.length;
  const outRe = new Array(N).fill(0);
  const outIm = new Array(N).fill(0);
  const sign = inverse ? 1 : -1;
  for (let k = 0; k < N; k++) {
    let sumRe = 0,
      sumIm = 0;
    for (let n = 0; n < N; n++) {
      const angle = (sign * 2 * Math.PI * k * n) / N;
      const c = Math.cos(angle),
        s = Math.sin(angle);
      sumRe += re[n] * c - im[n] * s;
      sumIm += re[n] * s + im[n] * c;
    }
    outRe[k] = inverse ? sumRe / N : sumRe;
    outIm[k] = inverse ? sumIm / N : sumIm;
  }
  return [outRe, outIm];
}

// Separable 2D DFT/inverse over a flat N*N real (+ optional imaginary) grid:
// 1D DFT on every row, then on every column — the same 1D formula from
// Chapter 7, run twice. Returns {re, im} flat N*N arrays.
function dft2d(reGrid, N, inverse, imGrid) {
  let re = reGrid.slice();
  let im = imGrid ? imGrid.slice() : new Array(N * N).fill(0);

  for (let y = 0; y < N; y++) {
    const rowRe = re.slice(y * N, y * N + N);
    const rowIm = im.slice(y * N, y * N + N);
    const [outRe, outIm] = dft1d(rowRe, rowIm, inverse);
    for (let x = 0; x < N; x++) {
      re[y * N + x] = outRe[x];
      im[y * N + x] = outIm[x];
    }
  }
  for (let x = 0; x < N; x++) {
    const colRe = [],
      colIm = [];
    for (let y = 0; y < N; y++) {
      colRe.push(re[y * N + x]);
      colIm.push(im[y * N + x]);
    }
    const [outRe, outIm] = dft1d(colRe, colIm, inverse);
    for (let y = 0; y < N; y++) {
      re[y * N + x] = outRe[y];
      im[y * N + x] = outIm[y];
    }
  }
  return { re, im };
}

// Re-renders a KaTeX formula only when the LaTeX string actually changes —
// used to substitute live numeric values into a formula as the user drags.
function liveFormula(el) {
  let last = null;
  return (tex) => {
    if (tex === last) return;
    last = tex;
    try {
      katex.render(tex, el, { throwOnError: false, displayMode: true });
    } catch (e) {
      /* ignore malformed intermediate TeX during drags */
    }
  };
}

// Pointer position in canvas CSS-pixel coordinates (matches the ctx already
// scaled for DPR in fitCanvas), for hit-testing draggable handles on canvas.
function canvasPoint(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function loop(fn) {
  let running = true;
  function frame(t) {
    if (!running) return;
    fn(t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return () => { running = false; };
}

// Colors matching css/style.css accents, for use in canvas drawing.
const COLORS = {
  accent: "#7dd3fc",
  accent2: "#f2a65a",
  accent3: "#7ee787",
  accent4: "#ff7777",
  grid: "#2a313c",
  text: "#9aa5b1",
};

function drawGrid(ctx, width, height, opts = {}) {
  const midY = opts.midY ?? height / 2;
  ctx.save();
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, midY + 0.5);
  ctx.lineTo(width, midY + 0.5);
  ctx.stroke();
  if (opts.vLineX !== undefined) {
    ctx.beginPath();
    ctx.moveTo(opts.vLineX + 0.5, 0);
    ctx.lineTo(opts.vLineX + 0.5, height);
    ctx.stroke();
  }
  ctx.restore();
}

// Axis titles + a few numeric ticks, drawn directly on the canvas. Every
// chart on the site calls this so no plot is left unlabeled.
function drawAxes(ctx, width, height, opts = {}) {
  const { xLabel = "", yLabel = "", xTicks = [], yTicks = [] } = opts;
  ctx.save();
  ctx.fillStyle = COLORS.text;
  ctx.font = "600 11px -apple-system, sans-serif";
  if (yLabel) {
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(yLabel, 8, 6);
  }
  if (xLabel) {
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(xLabel, width - 8, height - 20);
  }
  ctx.font = "10px -apple-system, sans-serif";
  ctx.fillStyle = "#6b7482";
  xTicks.forEach(({ x, text, align }) => {
    ctx.textAlign = align || "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(text, x, height - 6);
  });
  yTicks.forEach(({ y, text, align }) => {
    ctx.textAlign = align || "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 6, y);
  });
  ctx.restore();
}

// Fourier-series coefficients for the three classic target shapes.
// Returns [{k, amp}, ...] such that the signal = sum(amp * sin(2*pi*k*f*t)).
function fourierHarmonics(shape, n) {
  const terms = [];
  if (shape === "square") {
    for (let m = 1; m <= n; m++) {
      const k = 2 * m - 1;
      terms.push({ k, amp: (4 / Math.PI) * (1 / k) });
    }
  } else if (shape === "sawtooth") {
    for (let k = 1; k <= n; k++) {
      terms.push({ k, amp: (2 / Math.PI) * (Math.pow(-1, k + 1) / k) });
    }
  } else {
    for (let m = 1; m <= n; m++) {
      const k = 2 * m - 1;
      terms.push({ k, amp: (8 / (Math.PI * Math.PI)) * (Math.pow(-1, m - 1) / (k * k)) });
    }
  }
  return terms;
}

// Re-render KaTeX after DOM/content is ready (auto-render script does this on
// page load, but call this if a page injects formula markup dynamically).
function renderMathIn(el) {
  if (window.renderMathInElement) {
    renderMathInElement(el, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
      ],
    });
  }
}
