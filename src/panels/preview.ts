import { ui, type Lang } from '../i18n';
import type { FillData } from '../render';
import type { AppState } from '../state';

export interface PreviewPanelOptions {
  /** Renders the data onto the form, e.g. the app's `createFormFiller(...)`. */
  fill: (data: FillData) => Promise<{ pdf: Uint8Array }>;
  /** Draws each PDF page to a canvas, e.g. `renderPdfToCanvases` (lazy pdf.js). */
  renderPdf: (pdf: Uint8Array) => Promise<HTMLCanvasElement[]>;
  /** Wait this long after the last edit before re-rendering. Default: 400 ms. */
  delayMs?: number;
  /** Interface language. Default: 'en'. */
  lang?: Lang;
}

export interface PreviewPanel {
  /**
   * The PDF currently shown, if it is up to date with the current YAML; else undefined.
   * Lets the share button call `navigator.share` right away, inside the user's tap.
   */
  readyPdf(): Uint8Array | undefined;
}

/** Zero-size canvases free their backing store right away (matters on iOS Safari, which caps total canvas memory). */
function release(canvases: HTMLCanvasElement[]) {
  for (const canvas of canvases) {
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * Preview panel: re-renders the filled PDF (debounced) on every state change and
 * shows its pages as canvases. Results of renders overtaken by a newer one are dropped.
 */
export function mountPreviewPanel(root: HTMLElement, state: AppState, options: PreviewPanelOptions): PreviewPanel {
  const t = ui[options.lang ?? 'en'].preview;
  const heading = document.createElement('h2');
  heading.textContent = t.heading;
  const status = document.createElement('p');
  status.className = 'preview-status';
  status.setAttribute('role', 'status');
  const pages = document.createElement('div');
  pages.className = 'preview-pages';
  root.append(heading, status, pages);

  let timer: ReturnType<typeof setTimeout> | undefined;
  let latest = 0;
  let shown: { yaml: string; pdf: Uint8Array } | undefined;

  async function render() {
    const id = ++latest;
    const { yaml, result } = state.get();
    if (!result.ok) {
      status.textContent = t.paused;
      return;
    }
    root.classList.add('is-rendering');
    try {
      const { pdf } = await options.fill(result.data);
      const canvases = await options.renderPdf(pdf);
      if (id !== latest) return release(canvases);
      const old = [...pages.querySelectorAll('canvas')];
      pages.replaceChildren(...canvases);
      release(old);
      shown = { yaml, pdf };
      status.textContent = '';
    } catch (error) {
      if (id === latest) status.textContent = t.failed(String(error));
    } finally {
      if (id === latest) root.classList.remove('is-rendering');
    }
  }

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(render, options.delayMs ?? 400);
  };
  state.subscribe(schedule);
  schedule();

  return {
    readyPdf: () => (shown && shown.yaml === state.get().yaml ? shown.pdf : undefined),
  };
}
