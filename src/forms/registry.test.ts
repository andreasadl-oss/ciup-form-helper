import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getForm, listForms } from './registry';

// Vitest runs from the repo root.
const referenceLayout = readFileSync('reference/layout.yaml', 'utf8');

describe('form registry', () => {
  it('discovers every folder under /forms by its folder name', () => {
    expect(listForms().map((f) => f.id)).toContain('ciup-demande-manifestation-2026');
  });

  it('exposes the raw layout.yaml text of a form unchanged', () => {
    const form = getForm('ciup-demande-manifestation-2026');
    expect(form.layoutYaml).toBe(referenceLayout);
  });

  it('exposes a URL for the form PDF', () => {
    const form = getForm('ciup-demande-manifestation-2026');
    expect(form.pdfUrl).toMatch(/form\.pdf/);
  });

  it('throws a clear error for an unknown form id', () => {
    expect(() => getForm('nope')).toThrow(/nope/);
  });
});
