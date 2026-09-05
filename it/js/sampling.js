(function () {
  const canvas = document.getElementById("sampling-canvas");
  const statusBox = document.getElementById("status-box");
  const state = { sigFreq: 2, sampleRate: 10 };

  createKnob(document.getElementById("knob-sig-freq"), {
    min: 0.5,
    max: 12,
    step: 0.1,
    value: state.sigFreq,
    label: "Frequenza del segnale",
    unit: " Hz",
    decimals: 1,
    onChange: (v) => (state.sigFreq = v),
  });
  createKnob(document.getElementById("knob-sample-rate"), {
    min: 2,
    max: 24,
    step: 0.5,
    value: state.sampleRate,
    label: "Frequenza di campionamento",
    unit: " Hz",
    decimals: 1,
    onChange: (v) => (state.sampleRate = v),
  });

  const H = 300;
  let cw, ch, ctx;
  function resize() {
    ({ ctx, width: cw, height: ch } = fitCanvas(canvas, H));
  }
  resize();
  window.addEventListener("resize", resize);

  const windowSeconds = 2;
  const amp = 100;

  function foldFrequency(f, fs) {
    let m = f % fs;
    if (m > fs / 2) m = fs - m;
    return m;
  }

  function draw() {
    ctx.clearRect(0, 0, cw, ch);
    drawGrid(ctx, cw, ch);
    drawAxes(ctx, cw, ch, {
      yLabel: "Ampiezza",
      xLabel: "Tempo (s) →",
      xTicks: [
        { x: 4, text: "0", align: "left" },
        { x: cw - 4, text: `${windowSeconds}s`, align: "right" },
      ],
      yTicks: [{ y: ch / 2, text: "0" }],
    });

    // True continuous signal
    ctx.strokeStyle = "#5a6272";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= cw; x++) {
      const t = (x / cw) * windowSeconds;
      const y = ch / 2 - Math.sin(2 * Math.PI * state.sigFreq * t) * amp;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Samples
    const dt = 1 / state.sampleRate;
    const samples = [];
    for (let t = 0; t <= windowSeconds + dt; t += dt) {
      if (t > windowSeconds) break;
      samples.push({ t, v: Math.sin(2 * Math.PI * state.sigFreq * t) });
    }

    // Reconstruction (straight lines through samples)
    ctx.strokeStyle = COLORS.accent2;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    samples.forEach((s, i) => {
      const x = (s.t / windowSeconds) * cw;
      const y = ch / 2 - s.v * amp;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = COLORS.accent;
    samples.forEach((s) => {
      const x = (s.t / windowSeconds) * cw;
      const y = ch / 2 - s.v * amp;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    const nyquist = state.sampleRate / 2;
    if (state.sigFreq > nyquist) {
      const alias = foldFrequency(state.sigFreq, state.sampleRate);
      statusBox.style.borderLeftColor = COLORS.accent4;
      statusBox.innerHTML = `<strong style="color:#ff7777">Aliasing.</strong> Il segnale è di ${state.sigFreq.toFixed(
        1
      )} Hz, sopra la frequenza di Nyquist di ${nyquist.toFixed(
        1
      )} Hz. I campioni la fanno sembrare un'onda di ${alias.toFixed(2)} Hz.`;
    } else {
      statusBox.style.borderLeftColor = COLORS.accent3;
      statusBox.innerHTML = `<strong style="color:#7ee787">Fedele.</strong> Il segnale è di ${state.sigFreq.toFixed(
        1
      )} Hz, sotto la frequenza di Nyquist di ${nyquist.toFixed(1)} Hz — i campioni la ricostruiscono correttamente.`;
    }
  }

  loop(draw);
})();
