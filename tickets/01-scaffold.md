---
status: done
blocked_by: []
---
# 01 Scaffold and deploy

Spec: SPEC.md "Suggested issues" #1, "Architecture", "Constraints".

- Vite + TypeScript (strict) + Vitest at the repo root. App source in `/src`.
- Create `/forms/ciup-demande-manifestation-2026/` with `form.pdf` and `layout.yaml` copied unchanged from `/reference`. The app must load form files from this folder at runtime or build time (pick one and keep it generic: a second form should be just a new folder).
- **App shell built to avoid merge conflicts later**: `index.html` has one mount element per panel (`#prompt-panel`, `#yaml-panel`, `#form-panel`, `#preview-panel`, `#actions-panel`, `#notices`), and `src/main.ts` only wires panels together. Later tickets add modules under `src/` instead of growing `main.ts`.
- The page loads `form.pdf` and has a button that downloads it unchanged.
- GitHub Actions workflow `.github/workflows/deploy.yml`: run tests, build, deploy `dist/` to GitHub Pages. Vite `base` must work under a project subpath (`./`).
- `.gitignore` (node_modules, dist), npm scripts `dev`, `build`, `test`, `typecheck`.
- Short README stub (ticket 11 fills it in).
