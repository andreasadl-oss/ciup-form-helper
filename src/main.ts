// Wiring only: look up mount elements, create panels, connect them.
// Feature logic lives in modules under src/ (src/panels/*, src/forms/*, ...).
import { getFormDefinition } from './forms/definition';
import { generatePrompt } from './forms/prompt';
import { getForm, loadFormPdf } from './forms/registry';
import { mountActionsPanel } from './panels/actions';
import { mountNotices } from './panels/notices';
import { mountPromptPanel } from './panels/prompt';

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

mountActionsPanel(mount('actions-panel'), {
  getPdf: getBlankPdf,
  fileName: `${form.id}.pdf`,
  onError: (error) => notices.show(`Could not load the form PDF: ${String(error)}`, 'error'),
});

// Preload so the first click is instant and load errors show up early.
getBlankPdf().catch((error) => notices.show(`Could not load the form PDF: ${String(error)}`, 'error'));

mountPromptPanel(mount('prompt-panel'), { prompt: generatePrompt(getFormDefinition(FORM_ID)) });
