---
status: done
blocked_by: [03]
---
# 07 Prompt panel (generated)

Spec: SPEC.md "Suggested issues" #6, "Architecture" (prompt generated from the same files), "What it does" Option A.

- A pure function `FormDefinition → prompt string` reproducing `reference/prompt.md` (everything below its `---` line): rules, keys block grouped by section with `true`/`""` placeholders and help comments, appendix example, "My event:" footer. Text comes from meta.yaml, not hardcoded strings in TS.
- `#prompt-panel`: short instructions (copy → paste into any chatbot → describe your event → paste the YAML below), the prompt in a read-only box, and a copy button (Clipboard API with a fallback, and a "copied" confirmation).
- Tests: snapshot/contains-checks against `reference/prompt.md`; every valid key appears in the prompt.
