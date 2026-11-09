---
status: open
blocked_by: [04]
---
# 06 Live preview

Spec: SPEC.md "Suggested issues" #5, "Constraints" (phone-friendly).

- `#preview-panel`: re-render the PDF on state changes (debounced) and show it. iframe-with-blob-URL does not work on most mobile browsers, so use `pdfjs-dist` rendering pages to canvases (lazy-load pdf.js so the initial page stays light; configure the worker for Vite).
- Revoke old blob URLs / clean canvases; ignore stale renders when a newer one started.
- Tests for the debounce/stale-render logic; the canvas rendering itself can be checked manually (say how in your report).
