import { describe, expect, it } from 'vitest';
import { pdfFileName } from './file-name';

describe('pdfFileName', () => {
  it('names the PDF after the event date (ISO) and name, ASCII only', () => {
    expect(pdfFileName({ nom: 'Soirée acoustique des résidents', date_debut: '12/12/2026' })).toBe(
      'demande-manifestation-2026-12-12-soiree-acoustique-des-residents.pdf',
    );
  });

  it('falls back to the bare prefix when name and date are missing or unusable', () => {
    expect(pdfFileName({})).toBe('demande-manifestation.pdf');
    expect(pdfFileName({ nom: '🎸 / ⟨⟩', date_debut: 'TODO', type_concert: true })).toBe('demande-manifestation.pdf');
    expect(pdfFileName({ date_debut: '1/3/2027' })).toBe('demande-manifestation-2027-03-01.pdf');
  });

  it('strips path and shell characters and caps the name length', () => {
    const name = pdfFileName({ nom: `../..\\Con:cert "x" <${'a'.repeat(200)}>` });
    expect(name).toMatch(/^demande-manifestation-con-cert-x-a+\.pdf$/);
    expect(name.length).toBeLessThanOrEqual(100);
  });
});
