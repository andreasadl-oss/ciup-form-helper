---
status: open
blocked_by: [02]
---
# 04 Paste YAML → PDF

Spec: SPEC.md "Suggested issues" #3, "What it does" steps 2 and 5, "Validation" first bullet.

- `#yaml-panel`: a textarea for YAML. Parse with the `yaml` package (preferred: it gives line/column on errors).
- Invalid YAML: show the parser message and line number; this is the only hard block (no download).
- A small app state module (current data object + subscribe/update) that later tickets (05 form, 06 preview, 08 validation, 09 email) hook into, so they don't depend on each other's DOM.
- Download button renders the current data via the ticket 02 renderer. File name derived from the event name/date, safe characters only.
- Replace ticket 02's hardcoded example button with a "load example" action that puts `reference/example-data.yaml` content into the textarea.
- Tests: parse success/failure with line number, state updates.
