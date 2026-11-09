// Wiring only: look up mount elements, create panels, connect them.
// Feature logic lives in modules under src/ (src/panels/*, src/forms/*, src/render/*, ...).
import exampleYaml from '../reference/example-data.yaml?raw';
import { buildMailto } from './email';
import { pdfFileName } from './file-name';
import { getFormDefinition } from './forms/definition';
import { generatePrompt } from './forms/prompt';
import { getForm } from './forms/registry';
import { ui } from './i18n';
import { mountActionsPanel } from './panels/actions';
import { mountFormPanel } from './panels/form';
import { mountHeader } from './panels/header';
import { mountNotices } from './panels/notices';
import { mountPreviewPanel } from './panels/preview';
import { mountPromptPanel } from './panels/prompt';
import { connectValidation } from './panels/validation';
import { mountYamlPanel } from './panels/yaml';
import { uncoveredProblems } from './validation/validate';
import { createFontMetrics, parseLayout, type FillData } from './render';
import { createFormFiller } from './render/fill-form';
import { notoSans } from './render/noto-sans';
import { renderPdfToCanvases } from './render/pdf-canvas';
import { createAppState, type AppSnapshot } from './state';
import { createDraftStore, loadLang, persistDraft, saveLang } from './storage';

const FORM_ID = 'ciup-demande-manifestation-2026';

function mount(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing mount element #${id}`);
  return el;
}

const lang = loadLang();
const t = ui[lang];
document.documentElement.lang = lang;
document.title = t.page.title;
// Switching language reloads the page; the draft (saved on every change) brings the data back.
mountHeader(mount('page-header'), {
  lang,
  onLangChange: (next) => {
    saveLang(next);
    window.location.reload();
  },
});

const notices = mountNotices(mount('notices'));
const form = getForm(FORM_ID);
const def = getFormDefinition(FORM_ID);
const draft = createDraftStore(FORM_ID);
const state = createAppState(draft.load() ?? '');
persistDraft(state, draft);

const fill = createFormFiller(form);

mountYamlPanel(mount('yaml-panel'), state, { exampleYaml, lang, clearDraft: () => draft.clear() });

mountPromptPanel(mount('prompt-panel'), { prompt: generatePrompt(def, lang), lang });

const formPanel = mountFormPanel(mount('form-panel'), state, def, { lang });

connectValidation(state, {
  def,
  layout: parseLayout(form.layoutYaml),
  metrics: createFontMetrics(notoSans),
  formPanel,
  notices,
  lang,
});

const preview = mountPreviewPanel(mount('preview-panel'), state, { fill, renderPdf: renderPdfToCanvases, lang });

// Email needs no PDF: while the YAML is invalid it uses the last valid data.
let lastValidData: FillData = {};
const rememberValid = ({ result }: AppSnapshot) => {
  if (result.ok) lastValidData = result.data;
};
rememberValid(state.get());
state.subscribe(rememberValid);

const actions = mountActionsPanel(mount('actions-panel'), {
  lang,
  fileName: () => {
    const { result } = state.get();
    return pdfFileName(result.ok ? result.data : {});
  },
  getPdf: async () => {
    const { result } = state.get();
    if (!result.ok) throw new Error(t.actions.fixYamlFirst);
    const { pdf, problems } = await fill(result.data);
    notices.clear();
    // Validation already warns about text that doesn't fit or can't be drawn; show the rest.
    for (const p of uncoveredProblems(problems)) notices.show(t.actions.renderProblem(p.field, p.message), 'warning');
    return pdf;
  },
  readyPdf: preview.readyPdf,
  onError: (error) => notices.show(t.actions.pdfFailed(String(error)), 'error'),
  email: {
    getMailto: () => buildMailto(def.email, lastValidData),
  },
  share: true,
});
// Invalid YAML is the only hard block, for download and share (a restored draft can be invalid from the start).
actions.setPdfActionsEnabled(state.get().result.ok);
state.subscribe(({ result }) => actions.setPdfActionsEnabled(result.ok));

// Preload so the first click is instant and load errors show up early.
fill.blankPdf().catch((error) => notices.show(t.actions.loadFailed(String(error)), 'error'));

