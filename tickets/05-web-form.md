---
status: open
blocked_by: [03, 04]
---
# 05 Generated web form with two-way sync

Spec: SPEC.md "Suggested issues" #4, "Architecture" (UI generated from layout + meta).

- `#form-panel`: generate inputs from the ticket 03 `FormDefinition`: `text` → input, `lines` → textarea, `check` → checkbox; grouped by section; radio-like groups behave as "one or none" (allow unticking). Template fields (`dates`, `horaires`) show inputs for their data keys (`date_debut`… ) instead; dates can use a date-friendly input but data stays `jj/mm/aaaa`.
- Appendix editor: title, intro, outro, editable rows table (add/remove rows); columns/col_widths default to the prompt.md values.
- Two-way sync through the ticket 04 state module: editing the form updates the YAML text, editing/pasting YAML updates the form. Unchecked boxes are omitted from YAML (data contract). Don't clobber the textarea while the user is typing invalid YAML.
- Each field element must expose a stable hook (e.g. `data-field="<key>"` + a warning slot) so ticket 08 can attach warnings next to fields.
- Labels in EN for now (ticket 11 adds FR switching; read labels from meta by language key so that's easy).
- Tests: data → form → data round trip, group exclusivity, YAML serialisation omits false checks.
