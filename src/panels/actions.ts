import { downloadBytes } from '../download';

export interface ActionsPanelOptions {
  /** Produces the PDF to download (and to share). */
  getPdf: () => Promise<Uint8Array>;
  /** File name, or a function asked at click time (e.g. derived from the current data). */
  fileName: string | (() => string);
  /** Button text. Default: "Download PDF". */
  label?: string;
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
  /** Disable the download, email and share buttons, e.g. while the YAML doesn't parse. */
  setDownloadEnabled(enabled: boolean): void;
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

function makeButton(text: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.addEventListener('click', onClick);
  return button;
}

/** Actions panel: download button, and optionally email and share. */
export function mountActionsPanel(root: HTMLElement, options: ActionsPanelOptions): ActionsPanel {
  const fileName = () => (typeof options.fileName === 'function' ? options.fileName() : options.fileName);
  const buttons: HTMLButtonElement[] = [];

  const download = makeButton(options.label ?? 'Download PDF', async () => {
    try {
      downloadBytes(await options.getPdf(), fileName());
    } catch (error) {
      options.onError?.(error);
    }
  });
  buttons.push(download);
  root.append(download);

  if (options.email) {
    const { getMailto, open = (url: string) => window.location.assign(url) } = options.email;
    const group = document.createElement('div');
    group.className = 'email-action';
    const button = makeButton('Email', () => open(getMailto()));
    const reminder = document.createElement('span');
    reminder.className = 'email-reminder';
    reminder.textContent = 'Opens your mail app. Remember to attach the downloaded PDF.';
    group.append(button, reminder);
    buttons.push(button);
    root.append(group);
  }

  if (options.share && canShareFiles()) {
    const button = makeButton('Share PDF', async () => {
      try {
        const file = new File([(await options.getPdf()) as BlobPart], fileName(), { type: PDF_TYPE });
        await navigator.share({ files: [file], title: file.name });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) options.onError?.(error);
      }
    });
    buttons.push(button);
    root.append(button);
  }

  return {
    setDownloadEnabled(enabled) {
      for (const b of buttons) b.disabled = !enabled;
    },
  };
}
