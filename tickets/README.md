# Tickets

Local issue tracker for [SPEC.md](../SPEC.md). One file per ticket.

- Front matter: `status: open | done`, `blocked_by: [ids]`.
- A ticket is **ready** when every ticket in `blocked_by` is `done`.
- To close a ticket: set `status: done` in its file, in the same branch that implements it, and merge to the integration branch.

## Decisions made with the user (override the spec where they differ)

- Stack: **TypeScript + Vite**, no UI framework. Tests with **Vitest**. Package manager: npm.
- Font: **embed Noto Sans** (regular + bold) via `@pdf-lib/fontkit`, instead of Helvetica (ticket 10).
- Python is not used at runtime. `reference/fill.py` is the behavioural reference only.

## Graph

```
01 scaffold
├── 02 renderer ──┬── 04 paste-yaml ──┬── 05 web-form ──┐
│                 │                   ├── 06 preview    │
│                 │                   └── 09 email      │
│                 └── 10 unicode-font ──────────────────┼── 08 validation ── 11 polish
└── 03 meta ──────┬── 05, 09                            │
                  └── 07 prompt ────────────────────────┘
```
