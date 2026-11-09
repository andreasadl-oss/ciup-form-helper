---
status: done
blocked_by: [10]
---
# 12 Bug: missing glyphs with embedded Noto Sans

Found while checking ticket 11 in headless Edge: the preview shows "n Exemp e" for "Maison Exemple" and the checkbox X marks are missing; the same letters drop out consistently. Suspect the `subset: true` embed of Noto Sans via `@pdf-lib/fontkit` (ticket 10, `src/render/noto-sans.ts`, `src/render/font.ts`). Not yet known whether the downloaded PDF is affected too, or only pdf.js rendering.

- Reproduce on the integration branch: render `reference/example-data.yaml` with Noto, rasterise with pypdfium2 (as `reference/fill.py --preview` does) and with pdf.js, compare.
- Fix the root cause (e.g. a known pdf-lib/fontkit subsetting issue; embedding without subsetting is an acceptable fallback if size stays reasonable, state the size).
- Add a regression test that would have caught this (e.g. extract text from the rendered PDF with pdf.js and check it equals the input).
