// Wiring only: look up mount elements, create panels, connect them.
// Feature logic lives in modules under src/ (src/panels/*, src/forms/*, src/render/*, ...).
import exampleYaml from '../reference/example-data.yaml?raw';
import { pdfFileName } from './file-name';
import { getFormDefinition } from './forms/definition';
import { generatePrompt } from './forms/prompt';
import { getForm, loadFormPdf } from './forms/registry';
import { mountActionsPanel } from './panels/actions';
import { mountFormPanel } from './panels/form';
import { mountNotices } from './panels/notices';
import { mountPromptPanel } from './panels/prompt';
import { mountYamlPanel } from './panels/yaml';
import { createFormFiller } from './render/fill-form';
import { createAppState } from './state';

const FORM_ID = 'ciup-demande-manifestation-2026';

function mount(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing mount element #${id}`);
  return el;
}

const notices = mountNotices(mount('notices'));
const form = getForm(FORM_ID);
const state = createAppState();

let pdfBytes: Promise<Uint8Array> | undefined;
const getBlankPdf = () => (pdfBytes ??= loadFormPdf(form));
const fill = createFormFiller(form, getBlankPdf);

mountYamlPanel(mount('yaml-panel'), state, { exampleYaml });

const actions = mountActionsPanel(mount('actions-panel'), {
  fileName: () => {
    const { result } = state.get();
    return pdfFileName(result.ok ? result.data : {});
  },
  getPdf: async () => {
    const { result } = state.get();
    if (!result.ok) throw new Error('fix the YAML error first');
    const { pdf, problems } = await fill(result.data);
    notices.clear();
    for (const p of problems) notices.show(`${p.field}: ${p.message}`, 'warning');
    return pdf;
  },
  onError: (error) => notices.show(`Could not create the PDF: ${String(error)}`, 'error'),
});
// Invalid YAML is the only hard block.
state.subscribe(({ result }) => actions.setDownloadEnabled(result.ok));

// Preload so the first click is instant and load errors show up early.
getBlankPdf().catch((error) => notices.show(`Could not load the form PDF: ${String(error)}`, 'error'));

mountPromptPanel(mount('prompt-panel'), { prompt: generatePrompt(getFormDefinition(FORM_ID)) });

mountFormPanel(mount('form-panel'), state, getFormDefinition(FORM_ID));
