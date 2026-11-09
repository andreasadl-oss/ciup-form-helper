# CIUP form helper

An unofficial, static web page that helps residents of the Cité internationale universitaire de Paris fill in the "Demande de manifestation 2026" PDF form and email it to the events office. It is a community helper, not a CIUP service. See [SPEC.md](SPEC.md) for the full brief.

How people use it:

1. Get the event data as YAML: copy the generated prompt into any chatbot and describe the event (option A), or fill in the web form (option B).
2. Paste the YAML. The page parses it and fills in the web form.
3. Review the answers in the form. Warnings appear next to fields (late request, TODOs, text that won't fit, contradictions…).
4. Check the live preview of the filled PDF.
5. Download the PDF, or share it directly on phones that support it.
6. Press "Email" to open your own mail app with the recipient, subject and a short French message filled in, then attach the PDF.

The interface is in English by default, with a French switch. The language choice and the last draft are kept in the browser's `localStorage`. A "Clear draft" button removes the draft.

**Privacy.** Everything runs in the browser. Nothing typed is sent anywhere, there is no server and there are no analytics.

## Develop

Needs Node 24 and npm.

```sh
npm install
npm run dev        # local dev server
npm test           # Vitest
npm run typecheck
npm run build      # static site in dist/
npm run preview    # serve dist/ locally
```

## Deploy

`.github/workflows/deploy.yml` runs the tests, builds, and publishes `dist/` to GitHub Pages on every push to `main`. In the repository settings, set Pages → Source to "GitHub Actions". The build uses a relative base (`vite.config.ts`), so it works under a project subpath and on any other static host: just upload `dist/`.

## Code layout

- `forms/<form-id>/`: `form.pdf`, `layout.yaml`, `meta.yaml`. Every folder here is picked up at build time by `src/forms/registry.ts`.
- `src/main.ts`: wiring only. Panels live in `src/panels/`, one per mount element in `index.html`.
- `src/render/`: the PDF overlay (a port of `reference/fill.py`), using `pdf-lib` and an embedded Noto Sans font.
- `src/forms/`: the typed form definition (`layout.yaml` + `meta.yaml`), the generated prompt and YAML serialisation.
- `src/validation/`: warnings and their texts (EN/FR).
- `src/i18n.ts`: all other interface strings (EN/FR). `src/storage.ts`: draft and language in `localStorage`.

## Adding or updating a form

A form is one folder under `forms/`. To support the 2027 version, or another CIUP form, add a new folder (for example `forms/ciup-demande-manifestation-2027/`), then point `FORM_ID` in `src/main.ts` at it.

### 1. `form.pdf`

The original blank form, unchanged.

### 2. `layout.yaml`: where things go

`layout.yaml` has `pdf: form.pdf` and a `fields:` map from field name to position. Coordinates are PDF points from the **bottom-left** of the page, `y` is the **text baseline**, and pages start at 0.

| type | keys | what is drawn |
|---|---|---|
| `text` (default) | `page, x, y, w, [size=10], [template]` | One line. A white box covers the dotted leader, then the text is drawn. `template` combines data keys, e.g. `"Du {date_debut} au {date_fin}"`. |
| `check` | `page, x, y` | An "X" when the value is `true`. |
| `lines` | `page, x, y, w, leading, max_lines` | A wrapped paragraph over several dotted lines, shrunk down to 7 pt if needed. |

**Finding positions.** The printed labels tell you where each answer goes. Use `pypdf` to print each text fragment with its baseline position, then put the field just right of its label (`x` = end of the label, `y` = the label's baseline):

```python
from pypdf import PdfReader

reader = PdfReader("form.pdf")
for page_no, page in enumerate(reader.pages):
    def visitor(text, cm, tm, font_dict, font_size):
        if text.strip():
            x, y = tm[4] * cm[0] + cm[4], tm[5] * cm[3] + cm[5]
            print(page_no, round(x, 1), round(y, 1), repr(text))
    page.extract_text(visitor_text=visitor)
```

For checkboxes, use the position of the box glyph (`☐`). For `w`, measure to the end of the dotted leader. Then check visually: `python reference/fill.py layout.yaml reference/example-data.yaml --preview` (see `reference/requirements.txt`), or load the example in the app and look at the preview. No dotted leader should show through, and every X should land in its box.

### 3. `meta.yaml`: what each field means

`src/forms/definition.ts` loads it and checks it against `layout.yaml` (a missing or extra field is an error). The comments at the top of the existing file describe it. In short:

- `recipient`, `deadline_days`: where the email goes and how many days ahead the request must be sent (the "too late" warning).
- `email.subject`, `email.body`: templates with `{data_key}` placeholders. A `[bracketed part]` is dropped when one of its placeholders is empty.
- `prompt.intro`, `prompt.rules`, `prompt.outro`, `ciup_rules`: the text of the generated chatbot prompt. The field list is generated from `fields`.
- `sections`: `id` and `title: {en, fr}`, in form order.
- `fields.<key>`: one entry per layout field, and one per key used in a `template`, with `section`, `label: {en, fr}`, optional `help: {en, fr}`, optional `max_length`, and `format: date | time` for template keys.
- `groups.<id>`: sets of checkboxes where only one should be ticked (e.g. Oui / Non).
- `appendix`: the optional programme page (`section`, `label`, `help`, and an `example` with `columns` and `col_widths`).

Run `npm test` after any change: the tests check the definition against the layout and render the example data.
