---
status: done
blocked_by: [06, 08, 09]
---
# 11 Polish

Spec: SPEC.md "Suggested issues" #9, "Constraints", "Non-goals" (localStorage draft), "Open questions" (README guide).

- FR/EN interface switch, EN default, choice remembered in localStorage (try/catch). All UI strings, labels (from meta.yaml), validation messages translated.
- Visible unofficial-helper notice (community helper, not a CIUP service; no CIUP branding on the page) and privacy note (everything stays in the browser, nothing is sent, no analytics).
- Save/restore last draft (YAML) in localStorage with a "clear draft" button; wrap all storage access in try/catch.
- Phone layout: single column, usable at 360 px wide, large tap targets, no horizontal scroll; desktop can use two columns (form/YAML + preview). Flow order on page matches SPEC "What it does" steps.
- Web Share on iOS Safari: the share call must happen in the same user tap. Ticket 09 renders the PDF inside the click handler before calling `navigator.share`, which may lose that tap if rendering is slow. Keep a pre-rendered PDF ready (e.g. reuse the ticket 06 preview's latest render) so share is called right away.
- README: what it is, local dev, deploy, and an "Adding or updating a form" guide (folder layout, how positions were found per `reference/fill.py` / pypdf `visitor_text`, meta.yaml fields).
