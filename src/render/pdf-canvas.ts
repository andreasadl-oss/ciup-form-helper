/**
 * Draw PDF pages to canvases with pdf.js (iframe + blob URL does not work on
 * most mobile browsers). pdf.js and its worker are loaded on first use only,
 * so the initial page stays light. Checked manually, not in Vitest (no canvas in jsdom).
 */
type PdfJs = typeof import('pdfjs-dist');

let pdfjs: Promise<PdfJs> | undefined;

function loadPdfJs(): Promise<PdfJs> {
  pdfjs ??= Promise.all([
    import('pdfjs-dist'),
    // Vite emits the worker as a separate asset and gives us its URL.
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]).then(([lib, worker]) => {
    lib.GlobalWorkerOptions.workerSrc = worker.default;
    return lib;
  });
  pdfjs.catch(() => (pdfjs = undefined)); // allow a retry after e.g. a network blip
  return pdfjs;
}

/** Device pixels per PDF point: sharp on high-DPI phones, capped to bound canvas memory. */
function renderScale(): number {
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  return Math.min(2, Math.max(1.5, dpr));
}

export async function renderPdfToCanvases(pdf: Uint8Array): Promise<HTMLCanvasElement[]> {
  const lib = await loadPdfJs();
  // pdf.js transfers (detaches) the buffer it is given, so hand it a copy.
  const task = lib.getDocument({ data: pdf.slice() });
  try {
    const doc = await task.promise;
    const canvases: HTMLCanvasElement[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: renderScale() });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.setAttribute('aria-label', `Page ${n} of ${doc.numPages}`);
      canvas.setAttribute('role', 'img');
      await page.render({ canvas, viewport }).promise;
      canvases.push(canvas);
    }
    return canvases;
  } finally {
    await task.destroy();
  }
}
