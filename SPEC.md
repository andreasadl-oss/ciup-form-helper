# CIUP form helper: handoff spec

A static web page that helps residents of the Cité internationale universitaire de Paris (CIUP) fill in the official "Demande de manifestation 2026" PDF form and email it to the right address. This folder is a self-contained starting point for a new repository. Copy it in, then build from this spec.

## Why

To hold an event at the Cité (a concert, film screening, party…), residents must send this form to `evenements.internes@ciup.fr` **at least 2–3 weeks ahead**. The form is a flat PDF with no fillable fields, so people print it, fill it in by hand, or edit it awkwardly. Requests that arrive late or incomplete are refused. A real request was refused for being sent less than a week ahead, which is why this exists.

## What it does (v1)

1. **Get the YAML** in one of two ways:
   - **Option A: LLM-assisted.** The page shows a ready-made prompt with a copy button. The user pastes it into any chatbot (ChatGPT, Le Chat, Claude…), describes the event in a few sentences in any language, and gets back YAML.
   - **Option B: manual.** The user fills in the web form directly.
2. **Paste the YAML.** The page parses it and fills in the web form.
3. **Review and correct** in the web form. Warnings appear next to fields (see Validation).
4. **Live preview** of the filled PDF.
5. **Download** the PDF (form pages, plus an extra programme page for concerts).
6. **Email:** a `mailto:` button opens the user's own mail client with the recipient, subject and a short French body filled in. The user attaches the downloaded PDF. On mobile, offer a Web Share API button that shares the PDF file directly where it's supported.

## Constraints

- **Static only.** It must work on GitHub Pages (or any static host): no server, no API keys, no database, no secrets.
- **Private by design.** Everything happens in the browser. No data is sent anywhere, and there are no analytics that capture form contents. The page should say so.
- **Unofficial.** A visible notice says it is a community helper, not a CIUP service. The page itself must not use CIUP branding. The logo stays only because it is part of the original PDF.
- **English first.** The form and its answers are in French. The interface can be bilingual (FR/EN), but EN is the default.
- **Cost: €0.** Use free hosting, free libraries, and no paid APIs.
- **Phone-friendly.** Many residents will use it on a phone.

## Non-goals (v1)

- No built-in LLM, API proxy or chatbot: the copy-paste prompt replaces it. If added later, it would need a serverless proxy (e.g. a Cloudflare Worker) holding a key, with rate limiting, and that should be a separate decision.
- No sending email from a server: it causes spoofing and spam problems, needs credentials, and the request should come from the organiser's own address.
- No accounts, no saving on a server. (Optional: remember the last draft in `localStorage`.)
- No other CIUP forms yet, but keep the design generic so a second form is just a new folder.

## Architecture

```
/forms/ciup-demande-manifestation-2026/
    form.pdf        original blank form (unchanged)
    layout.yaml     field name → page/x/y/width/type  (the single source of truth)
    meta.yaml       (new) labels/help text/sections for the UI, recipient email, mail subject/body template, deadline in days
/src/               the web app
```

- **PDF filling:** `pdf-lib` in the browser. Load `form.pdf`, draw onto each page, and append the programme page. This is a port of `reference/fill.py`. Match its behaviour and its rendered output (`reference/example-output.*`).
- **YAML:** `js-yaml` (or `yaml`).
- **UI generated from `layout.yaml` + `meta.yaml`:** each `text` / `lines` field becomes an input or textarea, and each `check` field becomes a checkbox (grouped by section, with radio-like groups where the form implies one choice, e.g. `concert_ouvert_oui` / `concert_ouvert_non`).
- **Prompt generated from the same files.** Build the LLM prompt from `layout.yaml` + `meta.yaml` rather than hand-maintaining it, so the field list can never drift. The prompt follows the interface language and has the chatbot interview the user until every key that applies has a value; `reference/prompt.md` and `reference/prompt.fr.md` hold the generated output.
- **Framework:** your choice. A dependency-light setup (plain TS + Vite, or Preact) is fine. Vite builds to a static `dist/` and deploys to Pages with a GitHub Action.

## Data contract

**Layout (`layout.yaml`).** Coordinates are PDF points from the **bottom-left** of the page, and `y` is the **text baseline**. Page index starts at 0.

| type | keys | rendering |
|---|---|---|
| `text` (default) | `page, x, y, w, [size=10], [template]` | Paint a white rectangle `(x-1, y-3, w+2, 11.5)` over the dotted leader, then draw the text at `(x, y)`. `template` combines several data keys, e.g. `"Du {date_debut} au {date_fin}"`; skip the field if all of its keys are empty. |
| `check` | `page, x, y` | If the value is `true`, draw a bold "X" at `(x+1.4, y+0.6)`, size 10. |
| `lines` | `page, x, y, w, leading, max_lines` | Word-wrap to width `w`. If it needs more than `max_lines`, shrink the font by 0.5 pt steps down to 7 pt. Each line is whited out and drawn at `y - i*leading`. |

Ink colour is `#1a2a6c` and the font is Helvetica.

**Data (YAML from the user or the LLM).**
- The data is flat key/values, using the keys from `layout.yaml`, plus the keys used inside templates (`date_debut`, `date_fin`, `heure_debut`, `heure_fin`).
- Checkboxes are `true`, or the key is left out.
- The optional `appendix` key holds the programme page: `title, intro, columns, col_widths, rows`, and optionally `outro`.
- See `reference/example-data.yaml`.

## Validation (warnings, not hard blocks, except for invalid YAML)

- The YAML doesn't parse: show the parser error and the line number.
- Unknown key: probably an LLM typo, so suggest the closest valid key.
- The value contains `TODO`: highlight the field.
- The text doesn't fit (a `text` field is too wide, or `lines` still overflows at 7 pt).
- The **date is less than 21 days from today** (prominent warning: "the CIUP may refuse late requests"). The date is in the past, or the end date is before the start date.
- Contradictions: both Oui and Non ticked; "Concert" ticked with no `appendix` (the Sacem programme is required); "Payante" ticked (events at the Cité must be free); `remunere_oui` ticked with section 5 empty (a convention is required).
- Characters that Helvetica/WinAnsi can't draw (emoji, `⟨`, many non-Latin scripts): `pdf-lib` standard fonts will throw an error. Either replace or strip them with a warning, or embed a Unicode TTF font. Residents write names in many scripts, so embedding a font (e.g. Noto Sans) is probably worth it.

## Email

- To: `evenements.internes@ciup.fr`
- Subject: `Demande de manifestation : {nom}, {date_debut}`
- Body (French): a short greeting, a one-line description of the event, "formulaire et programme en pièce jointe", and the signature. Note that `mailto:` URLs have length limits, so keep the body short.
- Remind the user, right next to the button, to attach the PDF.

## Suggested issues (in order, each one demoable)

1. **Scaffold and deploy.** Vite app, GitHub Pages workflow, and a page that loads `form.pdf` and lets you download it unchanged.
2. **Port the renderer.** `pdf-lib` overlay driven by `layout.yaml`, using `reference/example-data.yaml` hardcoded as input. Compare against `reference/example-output.*` (text, checkboxes, wrapped lines, appendix page).
3. **Paste YAML → PDF.** A text area, parsing, parse errors shown, and download.
4. **Generated web form.** Build the inputs from the layout and `meta.yaml`, with two-way sync between the form and the YAML.
5. **Live preview.** Render the PDF in the page (`pdf.js`, or an `<iframe>` showing a blob URL).
6. **Prompt panel.** Generate the prompt from the layout and meta files, with a copy button and short instructions.
7. **Validation.** All the warnings above.
8. **Email and share.** `mailto:` and the Web Share API.
9. **Polish.** FR/EN interface, unofficial-helper notice, privacy note, `localStorage` draft, phone layout.
10. **Unicode font.** Embed a font if it isn't already handled in 2/7.

## Open questions

- Ask the house's event staff or residents' committee before launching. They may want to link to it, suggest changes, or say a new process is coming.
- Who updates `layout.yaml` when the CIUP publishes a new version of the form (e.g. 2027)? Write a short "adding/updating a form" guide in the README. `reference/fill.py` explains how positions were found: `pypdf`'s `extract_text(visitor_text=...)` gives each label's baseline position.
- Repo name, and whether it lives under a personal or a house account.

## Reference folder

| file | what it is |
|---|---|
| `form.pdf` | the blank official form (2 pages, A4, 595.5 × 842.25 pt) |
| `layout.yaml` | calibrated field positions (checked visually: no leftover dotted leaders) |
| `prompt.md`, `prompt.fr.md` | the generated LLM prompt in EN and FR, kept as test snapshots (not yet tested against real chatbots: do that early) |
| `fill.py` + `requirements.txt` | the working Python reference implementation (`python fill.py layout.yaml example-data.yaml --preview`) |
| `example-data.yaml` | fictional filled-in data |
| `example-output.pdf`, `.p1.png`, `.p2.png` | what the output should look like |
