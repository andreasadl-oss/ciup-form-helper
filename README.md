# CIUP form helper

Unofficial, static, in-browser helper for filling in the CIUP "Demande de manifestation 2026" PDF form. See [SPEC.md](SPEC.md).

## Develop

```sh
npm install
npm run dev        # local dev server
npm test           # Vitest
npm run typecheck
npm run build      # static site in dist/
```

## Layout

- `forms/<form-id>/` — `form.pdf`, `layout.yaml` (and `meta.yaml`). Every folder here is picked up at build time by `src/forms/registry.ts`.
- `src/main.ts` — wiring only. Panels live in `src/panels/`, one per mount element in `index.html`.
- `.github/workflows/deploy.yml` — tests, builds and deploys `dist/` to GitHub Pages on push to `main`.

TODO (ticket 11): usage, privacy note, adding/updating a form.
