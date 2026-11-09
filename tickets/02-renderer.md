---
status: open
blocked_by: [01]
---
# 02 Port the renderer

Spec: SPEC.md "Suggested issues" #2, "Data contract". Reference: `reference/fill.py`, `reference/example-output.{pdf,p1.png,p2.png}`.

- A pure module (no DOM) that takes form PDF bytes + parsed layout + data object and returns `{ pdf: Uint8Array, problems: Problem[] }`, using `pdf-lib`. Match `fill.py`: `text` / `check` / `lines` rendering, whiteout rectangles, templates (skip if all keys empty), font shrink in 0.5 pt steps to 7 pt, ink `#1a2a6c`.
- Appendix page (A4, margins 50) reproducing the reportlab output: title, intro, table with bold header row + rule below + grey grid + `col_widths`, wrapped cells, optional outro. Use the last page of `reference/example-output.pdf` as visual target (the PNGs show the two form pages); exactness to reportlab metrics is not required, a clean equivalent is.
- Hide font choice behind a small font abstraction (measure width, draw), because ticket 10 swaps Helvetica for embedded Noto Sans. Expose a text-width measure that validation (08) can reuse for "doesn't fit" checks.
- Wire it into the page: a button that renders `reference/example-data.yaml` (hardcoded/imported) and downloads the result.
- Tests: word-wrap, shrink loop, template skipping, check rendering, page count with/without appendix. Visually compare your output with `reference/example-output.*` and say in your report how you checked.
