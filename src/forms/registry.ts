/**
 * Form registry: every folder under `/forms/<id>/` is a form.
 *
 * Files are bundled at build time via `import.meta.glob`, so adding a second
 * form is just adding a new folder with `form.pdf` + `layout.yaml`
 * (and later `meta.yaml`). Parsing the YAML is left to the modules that need it.
 */

export interface FormFiles {
  /** Folder name, e.g. `ciup-demande-manifestation-2026`. */
  id: string;
  /** URL of the original blank PDF (an emitted static asset). */
  pdfUrl: string;
  /** Raw text of `layout.yaml`. */
  layoutYaml: string;
  /** Raw text of `meta.yaml`, if the folder has one. */
  metaYaml?: string;
}

const pdfUrls = import.meta.glob<string>('/forms/*/form.pdf', {
  query: '?url',
  import: 'default',
  eager: true,
});
const layouts = import.meta.glob<string>('/forms/*/layout.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const metas = import.meta.glob<string>('/forms/*/meta.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function folderOf(path: string): string {
  // '/forms/<id>/file' -> '<id>'
  return path.split('/')[2];
}

function byFolder(files: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(files).map(([path, value]) => [folderOf(path), value]));
}

const forms: FormFiles[] = (() => {
  const pdfs = byFolder(pdfUrls);
  const layoutTexts = byFolder(layouts);
  const metaTexts = byFolder(metas);
  return [...pdfs.keys()]
    .filter((id) => layoutTexts.has(id))
    .sort()
    .map((id) => ({
      id,
      pdfUrl: pdfs.get(id)!,
      layoutYaml: layoutTexts.get(id)!,
      metaYaml: metaTexts.get(id),
    }));
})();

export function listForms(): FormFiles[] {
  return forms;
}

export function getForm(id: string): FormFiles {
  const form = forms.find((f) => f.id === id);
  if (!form) throw new Error(`Unknown form "${id}". Known forms: ${forms.map((f) => f.id).join(', ')}`);
  return form;
}

/** Fetch the original PDF bytes of a form, unchanged. */
export async function loadFormPdf(form: FormFiles): Promise<Uint8Array> {
  const response = await fetch(form.pdfUrl);
  if (!response.ok) throw new Error(`Could not load ${form.pdfUrl}: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}
