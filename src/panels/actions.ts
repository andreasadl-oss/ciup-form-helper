import { downloadBytes } from '../download';
import { button } from './dom';
import { ui, type Lang } from '../i18n';

export interface ActionsPanelOptions {
  /** Produces the PDF to download (and to share). */
  getPdf: () => Promise<Uint8Array>;
  /**
   * An already rendered, up-to-date PDF, if there is one (e.g. the preview's `readyPdf`).
   * Sharing uses it so `navigator.share` runs inside the user's tap: iOS Safari
   * refuses to share once an await has lost the tap.
   */
  readyPdf?: () => Uint8Array | undefined;
  /** File name, or a function asked at click time (e.g. derived from the current data). */
  fileName: string | (() => string);
  /** Interface language. Default: 'en'. */
  lang?: Lang;
  /** Called when getPdf fails, e.g. to show a notice. */
  onError?: (error: unknown) => void;
  /** Adds an "Email" button that opens the user's mail client, plus a reminder to attach the PDF. */
  email?: {
    /** The `mailto:` URL, asked at click time (see `buildMailto`). */
    getMailto: () => string;
    /** Opens the URL. Default: navigate to it. */
    open?: (url: string) => void;
  };
  /** Adds a "Share PDF" button, shown only where the browser can share files (`navigator.canShare`). */
  share?: boolean;
}

export interface ActionsPanel {
  /** Enable or disable the buttons that need a PDF (download, share), e.g. while the YAML doesn't parse. Email stays enabled. */
  setPdfActionsEnabled(enabled: boolean): void;
}

const PDF_TYPE = 'application/pdf';

/** Web Share API with file support (mostly phones), probed with a dummy PDF. */
function canShareFiles(): boolean {
  try {
    const probe = new File([''], 'probe.pdf', { type: PDF_TYPE });
    return typeof navigator.share === 'function' && !!navigator.canShare?.({ files: [probe] });
  } catch {
    return false;
  }
}

/** Actions panel: download button, and optionally email and share. */
export function mountActionsPanel(root: HTMLElement, options: ActionsPanelOptions): ActionsPanel {
  const t = ui[options.lang ?? 'en'].actions;
  const fileName = () => (typeof options.fileName === 'function' ? options.fileName() : options.fileName);
  /** Buttons that need a PDF. */
  const pdfButtons: HTMLButtonElement[] = [];
  const heading = document.createElement('h2');
  heading.textContent = t.heading;
  root.append(heading);
  const row = document.createElement('div');
  row.className = 'button-row';

  const download = button(t.download, async () => {
    try {
      downloadBytes(await options.getPdf(), fileName());
    } catch (error) {
      options.onError?.(error);
    }
  });
  pdfButtons.push(download);
  row.append(download);

  if (options.share && canShareFiles()) {
    const sharePdf = (pdf: Uint8Array) => {
      const file = new File([pdf as BlobPart], fileName(), { type: PDF_TYPE });
      return navigator.share({ files: [file], title: file.name });
    };
    const shareButton = button(t.share, async () => {
      try {
        const ready = options.readyPdf?.();
        // No await before share when a PDF is ready: keeps the user's tap.
        await (ready ? sharePdf(ready) : sharePdf(await options.getPdf()));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) options.onError?.(error);
      }
    });
    pdfButtons.push(shareButton);
    row.append(shareButton);
  }
  root.append(row);

  if (options.email) {
    const { getMailto, open = (url: string) => window.location.assign(url) } = options.email;
    const group = document.createElement('div');
    group.className = 'email-action';
    const emailButton = button(t.email, () => open(getMailto()));
    const reminder = document.createElement('span');
    reminder.className = 'email-reminder';
    reminder.textContent = t.emailReminder;
    group.append(emailButton, reminder);
    root.append(group);
  }

  return {
    setPdfActionsEnabled(enabled) {
      for (const b of pdfButtons) b.disabled = !enabled;
    },
  };
}
