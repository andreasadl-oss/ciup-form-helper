// @vitest-environment node
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getForm } from '../forms/registry';
import { exampleData } from '../example-data.test-helper';
import { createFormFiller } from './fill-form';
import { notoSansFromDisk } from './noto-sans.test-helper';
import { drawnType0Widths } from './pdf-inspect.test-helper';

const blank = new Uint8Array(readFileSync('forms/ciup-demande-manifestation-2026/form.pdf'));

describe('createFormFiller', () => {
  it('renders data onto a registered form, loading the PDF once', async () => {
    let loads = 0;
    const fill = createFormFiller(getForm('ciup-demande-manifestation-2026'), async () => {
      loads++;
      return blank;
    }, notoSansFromDisk);
    const first = await fill(exampleData());
    await fill({ nom: 'Autre' });
    expect(loads).toBe(1);
    expect(first.problems).toEqual([]);
    expect((await PDFDocument.load(first.pdf)).getPageCount()).toBe(3);
  });

  it('shares the one load with blankPdf(), e.g. to preload the form', async () => {
    let loads = 0;
    const fill = createFormFiller(getForm('ciup-demande-manifestation-2026'), async () => {
      loads++;
      return blank;
    }, notoSansFromDisk);
    expect(await fill.blankPdf()).toBe(blank);
    await fill({ nom: 'Soirée' });
    expect(loads).toBe(1);
  });
});

describe('createFormFiller fonts', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('embeds Noto Sans by default, fetching the bundled font files', async () => {
    const fetched: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      fetched.push(url);
      const file = url.split('/').pop()!.split('?')[0];
      return new Response(readFileSync(`src/assets/fonts/${file}`));
    });
    const fill = createFormFiller(getForm('ciup-demande-manifestation-2026'), async () => blank);
    const { pdf, problems } = await fill({ nom: 'Привет Ωμέγα' });
    expect(problems).toEqual([]);
    expect(fetched.map((u) => u.split('/').pop()).sort()).toEqual(['NotoSans-Bold.ttf', 'NotoSans-Regular.ttf']);
    expect((await drawnType0Widths(pdf, 0)).map((r) => r.glyphs)).toEqual([12]);
  });

  it('keeps the example PDF small with subset Noto Sans', async () => {
    const fill = createFormFiller(getForm('ciup-demande-manifestation-2026'), async () => blank, notoSansFromDisk);
    const { pdf, problems } = await fill(exampleData());
    expect(problems).toEqual([]);
    expect(pdf.length - blank.length).toBeLessThan(50_000);
  });
});
