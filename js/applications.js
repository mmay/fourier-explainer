(function () {
  const DIAL_MIN = 0,
    DIAL_MAX = 10;
  const stations = [
    { freq: 1.4, amp: 0.8, tone: 2 },
    { freq: 3.2, amp: 0.6, tone: 4 },
    { freq: 5.0, amp: 0.9, tone: 1.5 },
    { freq: 7.1, amp: 0.5, tone: 6 },
    { freq: 8.8, amp: 0.7, tone: 3 },
  ];
  const LOCK_RANGE = 0.4;

  const specCanvas = document.getElementById("radio-spectrum-canvas");
  const timeCanvas = document.getElementById("radio-time-canvas");
  let sctx, sw, sh, tctx, tw, th;
  function resize() {
    ({ ctx: sctx, width: sw, height: sh } = fitCanvas(specCanvas, 180));
    ({ ctx: tctx, width: tw, height: th } = fitCanvas(timeCanvas, 180));
  }
  resize();
  window.addEventListener("resize", resize);

  const state = { dial: 5.0 };

  function nearestStation(dial) {
    let best = null,
      bestDist = Infinity;
    stations.forEach((s) => {
      const d = Math.abs(s.freq - dial);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    });
    return bestDist <= LOCK_RANGE ? best : null;
  }

  function draw() {
    const tuned = nearestStation(state.dial);

    // Spectrum / dial
    sctx.clearRect(0, 0, sw, sh);
    drawAxes(sctx, sw, sh, { yLabel: "Signal strength", xLabel: "Dial →" });
    const padding = 20;
    const dialToX = (f) => padding + ((f - DIAL_MIN) / (DIAL_MAX - DIAL_MIN)) * (sw - padding * 2);
    sctx.strokeStyle = COLORS.grid;
    sctx.beginPath();
    sctx.moveTo(padding, sh - 24.5);
    sctx.lineTo(sw - padding, sh - 24.5);
    sctx.stroke();
    stations.forEach((s) => {
      const x = dialToX(s.freq);
      const isTuned = tuned === s;
      sctx.strokeStyle = isTuned ? COLORS.accent2 : "#3a4250";
      sctx.lineWidth = isTuned ? 3 : 2;
      sctx.beginPath();
      sctx.moveTo(x, sh - 25);
      sctx.lineTo(x, sh - 25 - s.amp * (sh - 55));
      sctx.stroke();
    });
    // Tuner needle
    const nx = dialToX(state.dial);
    sctx.strokeStyle = COLORS.accent;
    sctx.lineWidth = 2;
    sctx.setLineDash([3, 3]);
    sctx.beginPath();
    sctx.moveTo(nx, 10);
    sctx.lineTo(nx, sh - 10);
    sctx.stroke();
    sctx.setLineDash([]);

    // Time-domain output
    tctx.clearRect(0, 0, tw, th);
    drawGrid(tctx, tw, th);
    drawAxes(tctx, tw, th, { yLabel: "Amplitude", xLabel: "Time →" });
    tctx.strokeStyle = COLORS.accent;
    tctx.lineWidth = 2.5;
    tctx.beginPath();
    for (let x = 0; x <= tw; x++) {
      const t = (x / tw) * 2;
      let y;
      if (tuned) {
        y = th / 2 - Math.sin(2 * Math.PI * tuned.tone * t) * tuned.amp * (th * 0.35);
      } else {
        y = th / 2 - (Math.sin(t * 977) * 0.5 + Math.sin(t * 5153) * 0.3) * (th * 0.15);
      }
      x === 0 ? tctx.moveTo(x, y) : tctx.lineTo(x, y);
    }
    tctx.stroke();
  }

  createKnob(document.getElementById("knob-tuner"), {
    min: DIAL_MIN,
    max: DIAL_MAX,
    step: 0.05,
    value: state.dial,
    label: "Tuner",
    decimals: 1,
    onChange: (v) => {
      state.dial = v;
      draw();
    },
  });

  draw();
})();
