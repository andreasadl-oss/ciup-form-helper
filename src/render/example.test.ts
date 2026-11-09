// @vitest-environment node
// End to end on the real CIUP form with reference/example-data.yaml.
import { readFileSync } from 'node:fs';
import { create as createFont } from '@pdf-lib/fontkit';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { exampleData } from '../example-data.test-helper';
import { parseLayout, renderForm } from '.';
import { notoSansFromDisk } from './noto-sans.test-helper';
import { drawnGlyphs, glyphRecordLength, textRuns } from './pdf-inspect.test-helper';

const dir = 'forms/ciup-demande-manifestation-2026';
const formPdf = new Uint8Array(readFileSync(`${dir}/form.pdf`));
const layout = parseLayout(readFileSync(`${dir}/layout.yaml`, 'utf8'));
const example = exampleData();

describe('rendering the example request', () => {
  it('fills both form pages and adds the programme page, without problems', async () => {
    const { pdf, problems } = await renderForm({ formPdf, layout, data: example });
    expect(problems).toEqual([]);
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(3);

    const page1 = (await textRuns(pdf, 0)).map((r) => r.text);
    expect(page1).toEqual(
      expect.arrayContaining(['Maison Exemple', 'Du 12/12/2026 au 12/12/2026', 'De 19 h 30 à 21 h 00', 'X']),
    );
    const interet = (await textRuns(pdf, 1)).filter((r) => r.x === 49.5 && r.y <= 282.2 && r.y > 230);
    expect(interet.length).toBeGreaterThan(1);
    expect(interet.length).toBeLessThanOrEqual(4);
  });

  it('embeds a Noto Sans subset that draws every character with its real outline (ticket 12)', async () => {
    const source = {
      regular: createFont(readFileSync('src/assets/fonts/NotoSans-Regular.ttf')),
      bold: createFont(readFileSync('src/assets/fonts/NotoSans-Bold.ttf')),
    };
    const { pdf } = await renderForm({ formPdf, layout, data: example, fonts: notoSansFromDisk });
    for (const page of [0, 1, 2]) {
      const runs = await drawnGlyphs(pdf, page);
      expect(runs.length).toBeGreaterThan(0);
      for (const run of runs) {
        const text = run.map((g) => g.char).join('');
        const wrong = run
          .filter((g) => {
            const font = g.bold ? source.bold : source.regular;
            const original = font.layout(g.char).glyphs[0]; // layout: a ligature glyph stands for several chars
            // FreeType/pdfium drop a glyph whose loca record is shorter than its data.
            return g.outline !== original.path.toSVG() || g.recordLength < glyphRecordLength(font, original.id);
          })
          .map((g) => g.char);
        expect({ text, wrong }).toEqual({ text, wrong: [] });
      }
    }
  });

  it('keeps the two form pages only when there is no appendix', async () => {
    const { pdf } = await renderForm({ formPdf, layout, data: { ...example, appendix: undefined } });
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(2);
  });
});
