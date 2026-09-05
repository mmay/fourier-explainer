# Fourier, Visually

An interactive, static-HTML introduction to Fourier transforms — sine waves, Fourier series, epicycles, the frequency domain, sampling/aliasing, and the DFT/FFT — each chapter with a live canvas visualization you can drag sliders on.

No build step, no framework. Plain HTML/CSS + one small vanilla-JS file per chapter's visualization. Math is rendered with [KaTeX](https://katex.org/) via CDN.

## Running it

Open `index.html` directly in a browser, or serve it locally (needed if your browser blocks `file://` canvas/script access):

```bash
python3 -m http.server 8934
```

Then visit `http://localhost:8934`.

## Structure

```
index.html              landing page / table of contents
pages/                   one HTML file per chapter
css/style.css            shared styles (dark theme, sidebar nav, controls)
js/common.js             shared canvas + slider helpers, Fourier coefficient math
js/<chapter>.js          one small script per chapter's visualization
```

Chapters (in order): sine wave basics → summing waves → Fourier series (square/sawtooth/triangle) → epicycles (rotating-circle sum) → time vs. frequency domain → sampling & aliasing → the DFT & FFT.

Each chapter page duplicates the sidebar nav markup (no templating/build step) — if you add a chapter, update the nav block in every page plus `index.html`'s table of contents.
