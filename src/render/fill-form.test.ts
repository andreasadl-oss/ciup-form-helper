// @vitest-environment node
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { getForm } from '../forms/registry';
import { createFormFiller, EXAMPLE_DATA } from './fill-form';

const blank = new Uint8Array(readFileSync('forms/ciup-demande-manifestation-2026/form.pdf'));

describe('createFormFiller', () => {
  it('renders data onto a registered form, loading the PDF once', async () => {
    let loads = 0;
    const fill = createFormFiller(getForm('ciup-demande-manifestation-2026'), async () => {
      loads++;
      return blank;
    });
    const first = await fill(EXAMPLE_DATA);
    await fill({ nom: 'Autre' });
    expect(loads).toBe(1);
    expect(first.problems).toEqual([]);
    expect((await PDFDocument.load(first.pdf)).getPageCount()).toBe(3);
  });
});

describe('EXAMPLE_DATA', () => {
  it('is reference/example-data.yaml', () => {
    expect(EXAMPLE_DATA).toMatchObject({ maison: 'Maison Exemple', type_concert: true });
    expect(EXAMPLE_DATA.appendix?.rows).toHaveLength(2);
  });
});
