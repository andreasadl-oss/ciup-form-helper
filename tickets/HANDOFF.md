# Handoff (2026-11-09)

State: all tickets 01–12 are `done` on the integration branch `spec/ciup-form-helper`. A code review ran after ticket 11, and its 22 findings plus ticket 12 are fixed (commits `0ce0710`..`3285243`). On that branch: 226 tests pass, and `typecheck` and `build` pass. `main` still holds only the spec, `reference/` and the tickets.

## Next steps
1. Check the ticket 12 fix in a browser. The Noto Sans subset was dropping letters ("n Exemp e"), and commit `0ce0710` pads the glyph records. Run `npm run dev`, click "Load example", then check the preview and the downloaded PDF.
2. Merge `spec/ciup-form-helper` into `main` (fast-forward is fine).
3. Create the GitHub repo (the name and whether it sits on a personal or house account are still open; see SPEC "Open questions"). Push it, then turn on Pages under Settings → Pages → Source: GitHub Actions. The workflow is `.github/workflows/deploy.yml` and deploys on pushes to `main`.

## Not verified yet (only checked in jsdom or headless Edge)
- A real phone (iOS Safari, Android Chrome): layout, live preview, and the Web Share of the PDF.
- `mailto:` in real mail clients (Outlook, Gmail web, phone apps).
- The generated prompt (`src/forms/prompt.ts`) with real chatbots. SPEC says to do this early.
- The FR/EN wording in `forms/ciup-demande-manifestation-2026/meta.yaml`, `src/i18n.ts` and `src/validation/messages.ts`. The texts were written by agents and nobody has proofread them.
- The pypdf position-finding snippet in the README, which has not been run.

## Known trade-offs
- An edit in the web form rewrites the YAML in a normalised shape, so comments and key order are lost.
- The main JS chunk is over Vite's 500 kB warning (mostly pdf-lib). pdf.js and fontkit already load lazily.
- The email body ends at "Cordialement," so the user signs it in their own mail client. There is no name key.
