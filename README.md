# Fourier, Visually

An interactive, static-HTML introduction to Fourier transforms — sine waves, Fourier series, epicycles, the frequency domain, sampling/aliasing, the DFT/FFT, the 2D transform on images, and real-world applications — each chapter with a live canvas visualization you can drag.

No build step, no framework. Plain HTML/CSS + one small vanilla-JS file per chapter's visualization. Math is rendered with [KaTeX](https://katex.org/) via CDN. Deployed at [t.fourier.help](https://t.fourier.help) (see `CNAME`).

## Running it

Open `index.html` directly in a browser, or serve it locally (needed if your browser blocks `file://` canvas/script access):

```bash
python3 -m http.server 8934
```

Then visit `http://localhost:8934`.

## Structure

```
index.html              landing page / table of contents
pages/                   one HTML file per chapter (English)
es/, it/, pl/            translated copies of index.html + pages/ + js/ (Chapters 1–7 only, see below)
css/style.css            shared styles (dark theme, sidebar nav, controls)
js/common.js             shared canvas + control-widget helpers, Fourier/DFT math
js/<chapter>.js          one small script per chapter's visualization
sitemap.xml, robots.txt  hand-maintained (no generator script)
CNAME                    custom domain for GitHub Pages
og-image.png             shared social-preview image, referenced by every page
```

Chapters (in order): sine wave basics → summing waves → Fourier series (square/sawtooth/triangle) → epicycles (rotating-circle sum) → time vs. frequency domain → sampling & aliasing → the DFT & FFT → the 2D Fourier transform on images → practical applications.

**Chapters 8–9 (2D FFT, Practical Applications) are English-only for now** — `es/`, `it/`, `pl/` still mirror only Chapters 1–7 and have no translated versions of the two newest chapters yet; their sidebar nav and the site's `hreflang` alternates reflect that (Chapters 8–9 only declare `en` + `x-default`).

Each chapter page duplicates the sidebar nav markup and SEO/meta boilerplate (title, description, canonical, OG tags, JSON-LD) — no templating/build step. If you add a chapter: update the nav `<ol>` in every English page (`index.html` + all of `pages/*.html`), add a `.toc-card` and a `hasPart` entry to `index.html`'s JSON-LD, and append an entry to `sitemap.xml`.
