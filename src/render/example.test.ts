// @vitest-environment node
// End to end on the real CIUP form with reference/example-data.yaml.
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { parseLayout, renderForm, type FillData } from '.';
import { textRuns } from './pdf-inspect.test-helper';

const dir = 'forms/ciup-demande-manifestation-2026';
const formPdf = new Uint8Array(readFileSync(`${dir}/form.pdf`));
const layout = parseLayout(readFileSync(`${dir}/layout.yaml`, 'utf8'));
const example = parse(readFileSync('reference/example-data.yaml', 'utf8')) as FillData;

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

  it('keeps the two form pages only when there is no appendix', async () => {
    const { pdf } = await renderForm({ formPdf, layout, data: { ...example, appendix: undefined } });
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(2);
  });
});
