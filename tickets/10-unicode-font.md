---
status: open
blocked_by: [02]
---
# 10 Embed Unicode font (Noto Sans)

Spec: SPEC.md "Validation" last bullet, "Suggested issues" #10. User decision: embed Noto Sans.

- Add Noto Sans Regular + Bold TTF (OFL; include the license file) to the repo, e.g. under `src/assets/fonts/` or the form folder. Get them from the official Noto source (github.com/notofonts or Google Fonts), static TTFs, not variable.
- Swap the ticket 02 font abstraction to embed them with `@pdf-lib/fontkit` (`subset: true` to keep the output PDF small). Use bold for the checkbox X and appendix header. Lazy-load the font bytes so they don't block first paint.
- Expose a glyph coverage check (`canDraw(text) → unsupported chars`) for ticket 08. When rendering, replace unsupported chars (emoji, CJK if not covered…) with `?` or strip them, and report them in `problems`, instead of throwing.
- Tests: accented French, Cyrillic, Greek, Vietnamese render without throwing; an emoji is reported and doesn't throw; output PDF size stays reasonable (state the number in your report).
