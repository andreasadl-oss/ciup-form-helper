import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FillData } from '../render';
import { createAppState } from '../state';
import { mountPreviewPanel, type PreviewPanelOptions } from './preview';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

/** A fill that encodes the data's `nom` into the PDF bytes, so tests can see which data was rendered. */
function fakeFill() {
  const calls: FillData[] = [];
  const fill: PreviewPanelOptions['fill'] = async (data) => {
    calls.push(data);
    return { pdf: new TextEncoder().encode(String(data.nom ?? '')) };
  };
  return { fill, calls };
}

/** renderPdf that makes one canvas per call, labelled with the PDF's text. */
const labelCanvas: PreviewPanelOptions['renderPdf'] = async (pdf) => {
  const canvas = document.createElement('canvas');
  canvas.dataset.label = new TextDecoder().decode(pdf);
  return [canvas];
};

function shownLabels(root: HTMLElement): string[] {
  return [...root.querySelectorAll('canvas')].map((c) => c.dataset.label ?? '');
}

function setup(options: Partial<PreviewPanelOptions> = {}, initialYaml = 'nom: A') {
  const root = document.createElement('div');
  document.body.append(root);
  const state = createAppState(initialYaml);
  const { fill, calls } = fakeFill();
  const panel = mountPreviewPanel(root, state, { fill, renderPdf: labelCanvas, delayMs: 300, ...options });
  return { root, state, calls, panel };
}

describe('preview panel', () => {
  it('shows the current data once the debounce delay has passed', async () => {
    const { root, state } = setup();
    state.setYaml('nom: B');
    await vi.advanceTimersByTimeAsync(299);
    expect(shownLabels(root)).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(shownLabels(root)).toEqual(['B']);
  });

  it('renders once, with the latest data, after a burst of edits', async () => {
    const { root, state, calls } = setup();
    await vi.advanceTimersByTimeAsync(300);
    calls.length = 0;
    for (const nom of ['B', 'C', 'D']) {
      state.setYaml(`nom: ${nom}`);
      await vi.advanceTimersByTimeAsync(100);
    }
    await vi.advanceTimersByTimeAsync(300);
    expect(calls).toEqual([{ nom: 'D' }]);
    expect(shownLabels(root)).toEqual(['D']);
  });

  it('ignores a slow render once a newer one has started', async () => {
    // Each renderPdf call waits until the test resolves it.
    const pending: { label: string; resolve: () => void }[] = [];
    const renderPdf: PreviewPanelOptions['renderPdf'] = (pdf) =>
      new Promise((resolve) => {
        const label = new TextDecoder().decode(pdf);
        const canvas = document.createElement('canvas');
        canvas.dataset.label = label;
        pending.push({ label, resolve: () => resolve([canvas]) });
      });
    const { root, state } = setup({ renderPdf });
    await vi.advanceTimersByTimeAsync(300);
    state.setYaml('nom: B');
    await vi.advanceTimersByTimeAsync(300);
    expect(pending.map((p) => p.label)).toEqual(['A', 'B']);

    pending[1].resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(shownLabels(root)).toEqual(['B']);
    pending[0].resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(shownLabels(root)).toEqual(['B']);
  });

  it('releases the memory of replaced and discarded canvases', async () => {
    const made: HTMLCanvasElement[] = [];
    let release: (() => void) | undefined;
    const renderPdf: PreviewPanelOptions['renderPdf'] = async (pdf) => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 800;
      canvas.dataset.label = new TextDecoder().decode(pdf);
      made.push(canvas);
      if (canvas.dataset.label === 'B') await new Promise<void>((r) => (release = r));
      return [canvas];
    };
    const { state } = setup({ renderPdf });
    await vi.advanceTimersByTimeAsync(300); // A shown
    state.setYaml('nom: B'); // slow, will be stale
    await vi.advanceTimersByTimeAsync(300);
    state.setYaml('nom: C'); // replaces A
    await vi.advanceTimersByTimeAsync(300);
    release!();
    await vi.advanceTimersByTimeAsync(0);

    const sizes = Object.fromEntries(made.map((c) => [c.dataset.label, [c.width, c.height]]));
    expect(sizes).toEqual({ A: [0, 0], B: [0, 0], C: [600, 800] });
  });

  it('keeps the last preview while the YAML does not parse, and says so', async () => {
    const { root, state, calls } = setup();
    await vi.advanceTimersByTimeAsync(300);
    state.setYaml('nom: [unclosed');
    await vi.advanceTimersByTimeAsync(300);
    expect(calls).toHaveLength(1);
    expect(shownLabels(root)).toEqual(['A']);
    expect(root.textContent).toMatch(/fix the YAML/i);

    state.setYaml('nom: B');
    await vi.advanceTimersByTimeAsync(300);
    expect(shownLabels(root)).toEqual(['B']);
    expect(root.textContent).not.toMatch(/fix the YAML/i);
  });

  it('shows render failures in the panel and recovers on the next edit', async () => {
    const renderPdf: PreviewPanelOptions['renderPdf'] = async (pdf) => {
      if (new TextDecoder().decode(pdf) === 'bad') throw new Error('boom');
      return labelCanvas(pdf);
    };
    const { root, state } = setup({ renderPdf }, 'nom: bad');
    await vi.advanceTimersByTimeAsync(300);
    expect(root.textContent).toMatch(/could not show the preview.*boom/i);

    state.setYaml('nom: B');
    await vi.advanceTimersByTimeAsync(300);
    expect(shownLabels(root)).toEqual(['B']);
    expect(root.textContent).not.toMatch(/could not/i);
  });

  it('previews the initial data on mount', async () => {
    const { root } = setup({}, 'nom: A');
    await vi.advanceTimersByTimeAsync(300);
    expect(shownLabels(root)).toEqual(['A']);
  });
});
