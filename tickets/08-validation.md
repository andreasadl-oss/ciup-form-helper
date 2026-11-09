---
status: open
blocked_by: [05, 07, 10]
---
# 08 Validation warnings

Spec: SPEC.md "Validation" (all bullets), "Why" (the 21-day rule is the reason this exists).

- A pure `validate(data, formDefinition, today) → Warning[]` module (field key, severity, message key/params). Rules: unknown key with closest valid key suggestion (edit distance); `TODO` values; text too wide / `lines` overflowing at 7 pt (reuse the ticket 02 measure with the ticket 10 font); date < 21 days away (prominent), date in the past, end before start, unparseable `jj/mm/aaaa`; Oui+Non both ticked in a group; concert without `appendix`; `entree_payante` ticked; `remunere_oui` with section 5 empty; characters the embedded font can't draw (glyph coverage check from ticket 10).
- UI: warnings next to fields via the ticket 05 hooks, plus a summary list in `#notices` with the 21-day warning prominent. Warnings never block download (only invalid YAML does, ticket 04).
- `today` injected for testability. Messages through a lookup so ticket 11 can translate them.
- Tests per rule.
