import { downloadBytes } from '../download';

export interface ActionsPanelOptions {
  /** Produces the PDF to download. */
  getPdf: () => Promise<Uint8Array>;
  /** File name, or a function asked at click time (e.g. derived from the current data). */
  fileName: string | (() => string);
  /** Button text. Default: "Download PDF". */
  label?: string;
  /** Called when getPdf fails, e.g. to show a notice. */
  onError?: (error: unknown) => void;
}

export interface ActionsPanel {
  /** Disable the download, e.g. while the YAML doesn't parse. */
  setDownloadEnabled(enabled: boolean): void;
}

/** Actions panel: download button (email/share buttons are added by later tickets). */
export function mountActionsPanel(root: HTMLElement, options: ActionsPanelOptions): ActionsPanel {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = options.label ?? 'Download PDF';
  button.addEventListener('click', async () => {
    try {
      const pdf = await options.getPdf();
      downloadBytes(pdf, typeof options.fileName === 'function' ? options.fileName() : options.fileName);
    } catch (error) {
      options.onError?.(error);
    }
  });
  root.append(button);
  return {
    setDownloadEnabled(enabled) {
      button.disabled = !enabled;
    },
  };
}
