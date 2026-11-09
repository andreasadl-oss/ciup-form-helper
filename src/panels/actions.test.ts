import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountActionsPanel } from './actions';

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

/** Capture what the browser would save, at the Blob URL / anchor boundary. */
function captureDownloads() {
  const saved: { name: string; blob: Blob }[] = [];
  let lastBlob: Blob | undefined;
  URL.createObjectURL = vi.fn((blob: Blob) => {
    lastBlob = blob;
    return 'blob:test';
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    saved.push({ name: this.download, blob: lastBlob! });
  });
  return saved;
}

const getText = () => ({ to: 'evenements.internes@ciup.fr', subject: 'Demande de manifestation', body: 'Bonjour,\n\nCordialement,' });

function buttonByText(root: HTMLElement, text: string): HTMLButtonElement {
  const button = [...root.querySelectorAll('button')].find((b) => b.textContent!.includes(text));
  if (!button) throw new Error(`no "${text}" button`);
  return button;
}

describe('actions panel', () => {
  it('downloads the PDF bytes unchanged under the given file name', async () => {
    const saved = captureDownloads();
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 1, 2, 3]);
    const root = document.createElement('div');
    document.body.append(root);

    mountActionsPanel(root, { getPdf: async () => bytes, fileName: 'form.pdf' });
    root.querySelector('button')!.click();
    await vi.waitFor(() => expect(saved).toHaveLength(1));

    expect(saved[0].name).toBe('form.pdf');
    expect(saved[0].blob.type).toBe('application/pdf');
    expect(new Uint8Array(await saved[0].blob.arrayBuffer())).toEqual(bytes);
  });

  it('asks for the file name at click time', async () => {
    const saved = captureDownloads();
    const root = document.createElement('div');
    let name = 'first.pdf';
    mountActionsPanel(root, { getPdf: async () => new Uint8Array([1]), fileName: () => name });
    name = 'second.pdf';
    root.querySelector('button')!.click();
    await vi.waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0].name).toBe('second.pdf');
  });

  it('can disable the download button', () => {
    const root = document.createElement('div');
    const panel = mountActionsPanel(root, { getPdf: async () => new Uint8Array(), fileName: 'f.pdf' });
    const button = root.querySelector('button')!;
    panel.setPdfActionsEnabled(false);
    expect(button.disabled).toBe(true);
    panel.setPdfActionsEnabled(true);
    expect(button.disabled).toBe(false);
  });

  it('keeps the Email button enabled when the PDF actions are disabled (mailto needs no PDF)', () => {
    const root = document.createElement('div');
    const panel = mountActionsPanel(root, {
      getPdf: async () => new Uint8Array(),
      fileName: 'f.pdf',
      email: { getMailto: () => 'mailto:x', getText, open: () => {} },
    });
    panel.setPdfActionsEnabled(false);
    expect(buttonByText(root, 'Email').disabled).toBe(false);
  });

  it('opens the mailto link built at click time, with an attach reminder next to the button', () => {
    const root = document.createElement('div');
    const opened: string[] = [];
    let url = 'mailto:a@b.c?subject=first';
    mountActionsPanel(root, {
      getPdf: async () => new Uint8Array(),
      fileName: 'f.pdf',
      email: { getMailto: () => url, getText, open: (u) => opened.push(u) },
    });
    url = 'mailto:a@b.c?subject=second';
    const button = buttonByText(root, 'Email');
    button.click();
    expect(opened).toEqual(['mailto:a@b.c?subject=second']);
    const reminder = button.parentElement!.textContent!;
    expect(reminder).toMatch(/attach/i);
    expect(reminder).toMatch(/PDF/);
  });

  it('shows the address and a Cc hint in plain text, for when the mail app does not open', () => {
    const root = document.createElement('div');
    mountActionsPanel(root, { getPdf: async () => new Uint8Array(), fileName: 'f.pdf', email: { getMailto: () => 'mailto:x', getText } });
    expect(root.querySelector('.email-to')!.textContent).toBe('Send it to: evenements.internes@ciup.fr');
    expect(root.querySelector('.email-cc')!.textContent).toMatch(/Cc your house/);
    expect(root.querySelector('.email-fallback')!.textContent).toMatch(/Brave/);
  });

  it('copies the address, subject and text as they are at click time', async () => {
    const copied: string[] = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => void copied.push(text) },
    });
    const root = document.createElement('div');
    let subject = 'first';
    mountActionsPanel(root, {
      getPdf: async () => new Uint8Array(),
      fileName: 'f.pdf',
      email: { getMailto: () => 'mailto:x', getText: () => ({ ...getText(), subject }) },
    });
    subject = 'Demande de manifestation : Soirée';
    buttonByText(root, 'Copy address').click();
    buttonByText(root, 'Copy subject').click();
    buttonByText(root, 'Copy text').click();
    await vi.waitFor(() => expect(copied).toHaveLength(3));
    expect(copied).toEqual(['evenements.internes@ciup.fr', 'Demande de manifestation : Soirée', 'Bonjour,\n\nCordialement,']);
    await vi.waitFor(() => expect(root.querySelector('.copy-status')!.textContent).toBe('Copied!'));
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('has no email button unless asked for', () => {
    const root = document.createElement('div');
    mountActionsPanel(root, { getPdf: async () => new Uint8Array(), fileName: 'f.pdf' });
    expect(root.querySelectorAll('button')).toHaveLength(1);
  });

  describe('share button', () => {
    afterEach(() => {
      delete (navigator as Partial<Navigator>).canShare;
      delete (navigator as Partial<Navigator>).share;
    });

    function fakeWebShare(canShareFiles: boolean) {
      const shared: ShareData[] = [];
      Object.defineProperty(navigator, 'canShare', {
        configurable: true,
        value: (data?: ShareData) => canShareFiles && !!data?.files?.length,
      });
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data: ShareData) => void shared.push(data),
      });
      return shared;
    }

    const mountWithShare = (root: HTMLElement, getPdf = async () => new Uint8Array([1, 2, 3])) =>
      mountActionsPanel(root, { getPdf, fileName: () => 'demande.pdf', share: true });

    it('is hidden when the browser has no Web Share API', () => {
      const root = document.createElement('div');
      mountWithShare(root);
      expect(root.textContent).not.toContain('Share');
    });

    it('is hidden when the browser cannot share files', () => {
      fakeWebShare(false);
      const root = document.createElement('div');
      mountWithShare(root);
      expect(root.textContent).not.toContain('Share');
    });

    it('shares the rendered PDF as a file when the browser can share files', async () => {
      const shared = fakeWebShare(true);
      const root = document.createElement('div');
      mountWithShare(root);
      buttonByText(root, 'Share').click();
      await vi.waitFor(() => expect(shared).toHaveLength(1));
      const [file] = shared[0].files!;
      expect(file.name).toBe('demande.pdf');
      expect(file.type).toBe('application/pdf');
      expect(new Uint8Array(await file.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    });

    it('ignores the user cancelling the share sheet but reports other failures', async () => {
      fakeWebShare(true);
      const errors: unknown[] = [];
      const root = document.createElement('div');
      const failures: Error[] = [new DOMException('cancelled', 'AbortError'), new Error('boom')];
      let calls = 0;
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async () => Promise.reject(failures[calls++]),
      });
      mountActionsPanel(root, {
        getPdf: async () => new Uint8Array(),
        fileName: 'f.pdf',
        share: true,
        onError: (e) => errors.push(e),
      });
      const share = buttonByText(root, 'Share');
      share.click();
      share.click();
      await vi.waitFor(() => expect(calls).toBe(2));
      await vi.waitFor(() => expect(errors).toHaveLength(1));
      expect(String(errors[0])).toContain('boom');
    });

    it('shares a ready PDF within the same tap (no await before navigator.share, for iOS Safari)', async () => {
      const shared = fakeWebShare(true);
      const root = document.createElement('div');
      let getPdfCalls = 0;
      mountActionsPanel(root, {
        getPdf: async () => (getPdfCalls++, new Uint8Array([9])),
        readyPdf: () => new Uint8Array([4, 5]),
        fileName: 'demande.pdf',
        share: true,
      });
      buttonByText(root, 'Share').click();
      expect(shared).toHaveLength(1); // synchronously, still inside the click
      expect(new Uint8Array(await shared[0].files![0].arrayBuffer())).toEqual(new Uint8Array([4, 5]));
      expect(getPdfCalls).toBe(0);
    });

    it('renders the PDF first when none is ready yet', async () => {
      const shared = fakeWebShare(true);
      const root = document.createElement('div');
      mountActionsPanel(root, {
        getPdf: async () => new Uint8Array([9]),
        readyPdf: () => undefined,
        fileName: 'demande.pdf',
        share: true,
      });
      buttonByText(root, 'Share').click();
      await vi.waitFor(() => expect(shared).toHaveLength(1));
      expect(new Uint8Array(await shared[0].files![0].arrayBuffer())).toEqual(new Uint8Array([9]));
    });
    it('is disabled together with the download', () => {
      fakeWebShare(true);
      const root = document.createElement('div');
      const panel = mountWithShare(root);
      panel.setPdfActionsEnabled(false);
      expect(buttonByText(root, 'Share').disabled).toBe(true);
    });
  });

  it('shows French texts when lang is fr', () => {
    const root = document.createElement('div');
    mountActionsPanel(root, {
      getPdf: async () => new Uint8Array(),
      fileName: 'f.pdf',
      email: { getMailto: () => 'mailto:x', getText },
      lang: 'fr',
    });
    expect(buttonByText(root, 'Télécharger le PDF')).toBeTruthy();
    expect(root.textContent).toContain("N'oubliez pas de joindre le PDF");
    expect(root.textContent).toContain('À envoyer à : evenements.internes@ciup.fr');
  });
  it('reports getPdf failures instead of downloading', async () => {
    const saved = captureDownloads();
    const root = document.createElement('div');
    const errors: unknown[] = [];
    mountActionsPanel(root, {
      getPdf: async () => Promise.reject(new Error('boom')),
      fileName: 'f.pdf',
      onError: (e) => errors.push(e),
    });
    root.querySelector('button')!.click();
    await vi.waitFor(() => expect(errors).toHaveLength(1));
    expect(saved).toEqual([]);
  });
});
