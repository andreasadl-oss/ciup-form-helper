---
status: open
blocked_by: [01]
---
# 03 meta.yaml and form definition module

Spec: SPEC.md "Architecture" (meta.yaml), "Email", "Validation". Content source: `reference/prompt.md` (the comments there are the field help texts).

- Write `/forms/ciup-demande-manifestation-2026/meta.yaml`: sections (1–6 + appendix) with EN and FR titles; per-field EN/FR label and help text (incl. extra keys used only in templates: `date_debut`, `date_fin`, `heure_debut`, `heure_fin`); radio-like groups (e.g. `concert_ouvert_oui`/`concert_ouvert_non`, `artiste_oui`/`artiste_non`, `remunere_oui`/`remunere_non`, `entree_gratuite`/`entree_payante`, `soiree_interne`/`soiree_externe`…); recommended max lengths from prompt.md; recipient email; mail subject and short French body templates; deadline in days (21); the prompt's rules text and CIUP rules.
- A typed loader module that combines `layout.yaml` + `meta.yaml` into one `FormDefinition` (fields in order, with type, section, labels, help, group, data keys incl. template keys, list of all valid data keys). This is the single API that tickets 05, 07, 08, 09 consume.
- Tests: every layout field has meta, every meta field exists in layout or is a template key, groups reference real check fields, valid-keys list.
