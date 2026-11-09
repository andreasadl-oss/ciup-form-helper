import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dataKeysOf, parseLayout } from './layout';

const ciupLayout = readFileSync('forms/ciup-demande-manifestation-2026/layout.yaml', 'utf8');

describe('parseLayout', () => {
  const layout = parseLayout(ciupLayout);

  it('reads the pdf file name', () => {
    expect(layout.pdf).toBe('form.pdf');
  });

  it('defaults a field without type to text at size 10', () => {
    expect(layout.fields.nom).toEqual({ type: 'text', page: 0, x: 151, y: 506.7, w: 390, size: 10 });
  });

  it('reads check fields', () => {
    expect(layout.fields.artiste_oui).toEqual({ type: 'check', page: 1, x: 168.9, y: 656.8 });
  });

  it('reads lines fields with leading and max lines', () => {
    expect(layout.fields.interet).toEqual({
      type: 'lines',
      page: 1,
      x: 49.5,
      y: 282.2,
      w: 490,
      size: 10,
      leading: 14.3,
      maxLines: 4,
    });
  });

  it('keeps templates', () => {
    expect(layout.fields.dates).toMatchObject({ type: 'text', template: 'Du {date_debut} au {date_fin}' });
  });

  it('rejects a field with a missing coordinate, naming the field', () => {
    expect(() => parseLayout('pdf: f.pdf\nfields:\n  bad: {page: 0, x: 1, w: 3}\n')).toThrow(/bad.*y/);
  });

  it('rejects an unknown field type', () => {
    expect(() => parseLayout('pdf: f.pdf\nfields:\n  bad: {type: radio, page: 0, x: 1, y: 2}\n')).toThrow(/radio/);
  });
});

describe('dataKeysOf', () => {
  const layout = parseLayout(ciupLayout);

  it('is the field name for plain fields', () => {
    expect(dataKeysOf('nom', layout.fields.nom)).toEqual(['nom']);
    expect(dataKeysOf('artiste_oui', layout.fields.artiste_oui)).toEqual(['artiste_oui']);
  });

  it('is the template keys for templated fields', () => {
    expect(dataKeysOf('dates', layout.fields.dates)).toEqual(['date_debut', 'date_fin']);
  });
});
