import { downloadBytes } from '../download';

export interface ActionsPanelOptions {
  /** Produces the PDF to download (today: the blank form; later: the filled one). */
  getPdf: () => Promise<Uint8Array>;
  fileName: string;
  /** Called when getPdf fails, e.g. to show a notice. */
  onError?: (error: unknown) => void;
}

/** Actions panel: download button (email/share buttons are added by later tickets). */
export function mountActionsPanel(root: HTMLElement, options: ActionsPanelOptions): void {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Download PDF';
  button.addEventListener('click', async () => {
    try {
      downloadBytes(await options.getPdf(), options.fileName);
    } catch (error) {
      options.onError?.(error);
    }
  });
  root.append(button);
}
