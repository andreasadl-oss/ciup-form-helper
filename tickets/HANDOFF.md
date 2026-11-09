# Handoff (2026-11-09)

State: all tickets 01–12 are `done` and merged into `main`. The repo is public at https://github.com/andreasadl-oss/ciup-form-helper and the site is live at https://andreasadl-oss.github.io/ciup-form-helper/. Every push to `main` runs the tests, builds and deploys (`.github/workflows/deploy.yml`).

Since the tickets:
- Issue templates in `.github/ISSUE_TEMPLATE/` (Problem, Improvement; FR/EN; blank issues off). The header links to them (`FEEDBACK_URL` in `src/panels/header.ts`).
- The chatbot steps refer to the Preview by name instead of its position (it is on the right on desktop, below on phones), and step 6 says to download and send the PDF.

## Not verified yet (only checked in jsdom or headless Edge)
These could move to GitHub issues, and this file could then go.
- The ticket 12 font fix in a real browser: "Load example", then check that the preview and the downloaded PDF show every letter (the bug looked like "n Exemp e").
- A real phone (iOS Safari, Android Chrome): layout, live preview, and the Web Share of the PDF.
- `mailto:` in real mail clients (Outlook, Gmail web, phone apps).
- The generated prompt (`src/forms/prompt.ts`) with real chatbots. SPEC says to do this early.
- The FR/EN wording in `forms/ciup-demande-manifestation-2026/meta.yaml`, `src/i18n.ts` and `src/validation/messages.ts`. The texts were written by agents and nobody has proofread them.
- The pypdf position-finding snippet in the README, which has not been run.

## Still open from SPEC
- Ask the house's event staff or residents' committee before announcing the site.
- Who updates the form files when the CIUP publishes a new version (e.g. 2027)?

## Known trade-offs
- An edit in the web form rewrites the YAML in a normalised shape, so comments and key order are lost.
- The main JS chunk is over Vite's 500 kB warning (mostly pdf-lib). pdf.js and fontkit already load lazily.
- The email body ends at "Cordialement," so the user signs it in their own mail client. There is no name key.
