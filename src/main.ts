// Wiring only: look up mount elements, create panels, connect them.
// Feature logic lives in modules under src/ (src/panels/*, src/forms/*, src/render/*, ...).
import exampleYaml from '../reference/example-data.yaml?raw';
import { buildMailto } from './email';
import { pdfFileName } from './file-name';
import { getFormDefinition } from './forms/definition';
import { generatePrompt } from './forms/prompt';
import { getForm, loadFormPdf } from './forms/registry';
import { mountActionsPanel } from './panels/actions';
import { mountFormPanel } from './panels/form';
import { mountNotices } from './panels/notices';
import { mountPreviewPanel } from './panels/preview';
import { mountPromptPanel } from './panels/prompt';
import { connectValidation } from './panels/validation';
import { mountYamlPanel } from './panels/yaml';
import { createFontMetrics, parseLayout } from './render';
import { createFormFiller } from './render/fill-form';
import { notoSans } from './render/noto-sans';
import { renderPdfToCanvases } from './render/pdf-canvas';
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
    // The renderer's problems (too wide, too long, can't draw) are already shown by validation.
    const { pdf } = await fill(result.data);
    notices.clear();
    return pdf;
  },
  onError: (error) => notices.show(`Could not create the PDF: ${String(error)}`, 'error'),
  email: {
    getMailto: () => {
      const { result } = state.get();
      return buildMailto(getFormDefinition(FORM_ID).email, result.ok ? result.data : {});
    },
  },
  share: true,
});
// Invalid YAML is the only hard block.
state.subscribe(({ result }) => actions.setDownloadEnabled(result.ok));

// Preload so the first click is instant and load errors show up early.
getBlankPdf().catch((error) => notices.show(`Could not load the form PDF: ${String(error)}`, 'error'));

mountPromptPanel(mount('prompt-panel'), { prompt: generatePrompt(getFormDefinition(FORM_ID)) });

const formPanel = mountFormPanel(mount('form-panel'), state, getFormDefinition(FORM_ID));

connectValidation(state, {
  def: getFormDefinition(FORM_ID),
  layout: parseLayout(form.layoutYaml),
  metrics: createFontMetrics(notoSans),
  formPanel,
  notices,
});

mountPreviewPanel(mount('preview-panel'), state, { fill, renderPdf: renderPdfToCanvases });
