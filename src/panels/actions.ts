import { downloadBytes } from '../download';
import type { EmailText } from '../email';
import { copyText } from './clipboard';
import { button, el } from './dom';
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
  /**
   * Adds an "Email" button that opens the user's mail client, a reminder to attach the PDF,
   * the address and a Cc hint in plain sight, and copy buttons for when `mailto:` is blocked.
   */
  email?: {
    /** The `mailto:` URL, asked at click time (see `buildMailto`). */
    getMailto: () => string;
    /** The same email as plain text, asked at copy time (see `buildEmailText`). */
    getText: () => EmailText;
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
    const { getMailto, getText, open = (url: string) => window.location.assign(url) } = options.email;
    const group = el('div', 'email-action');
    group.append(button(t.email, () => open(getMailto())), el('span', 'email-reminder', t.emailReminder));

    // Where to send it, without writing the address into the page text (the copy button and the form carry it).
    const sendTo = el('p', 'email-to', t.sendTo);
    const cc = el('p', 'email-cc', t.ccHouse);

    // Brave and some setups block mailto:, so the user can write the email by hand.
    const status = el('span', 'copy-status');
    status.setAttribute('role', 'status');
    const copyButton = (label: string, part: keyof EmailText) =>
      button(label, async () => {
        status.textContent = (await copyText(getText()[part])) ? t.copied : t.copyFailed;
      });
    const copyRow = el('div', 'button-row email-copy');
    copyRow.append(
      copyButton(t.copyAddress, 'to'),
      copyButton(t.copySubject, 'subject'),
      copyButton(t.copyBody, 'body'),
      status,
    );
    root.append(group, sendTo, cc, el('p', 'email-fallback', t.noMailApp), copyRow);
  }

  return {
    setPdfActionsEnabled(enabled) {
      for (const b of pdfButtons) b.disabled = !enabled;
    },
  };
}
