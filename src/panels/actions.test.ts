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

  it('uses the given button label', () => {
    const root = document.createElement('div');
    mountActionsPanel(root, { getPdf: async () => new Uint8Array(), fileName: 'f.pdf', label: 'Download example' });
    expect(root.querySelector('button')!.textContent).toBe('Download example');
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
