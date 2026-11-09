// Wiring only: look up mount elements, create panels, connect them.
// Feature logic lives in modules under src/ (src/panels/*, src/forms/*, src/render/*, ...).
import { getForm, loadFormPdf } from './forms/registry';
import { mountActionsPanel } from './panels/actions';
import { mountNotices } from './panels/notices';
import { createFormFiller, EXAMPLE_DATA } from './render/fill-form';

const FORM_ID = 'ciup-demande-manifestation-2026';

function mount(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing mount element #${id}`);
  return el;
}

const notices = mountNotices(mount('notices'));
const form = getForm(FORM_ID);

let pdfBytes: Promise<Uint8Array> | undefined;
const getBlankPdf = () => (pdfBytes ??= loadFormPdf(form));
const fill = createFormFiller(form, getBlankPdf);

// Until the YAML panel exists (ticket 04), the button renders reference/example-data.yaml.
mountActionsPanel(mount('actions-panel'), {
  label: 'Download example PDF',
  fileName: `${form.id}-example.pdf`,
  getPdf: async () => {
    const { pdf, problems } = await fill(EXAMPLE_DATA);
    notices.clear();
    for (const p of problems) notices.show(`${p.field}: ${p.message}`, 'warning');
    return pdf;
  },
  onError: (error) => notices.show(`Could not create the PDF: ${String(error)}`, 'error'),
});

// Preload so the first click is instant and load errors show up early.
getBlankPdf().catch((error) => notices.show(`Could not load the form PDF: ${String(error)}`, 'error'));
