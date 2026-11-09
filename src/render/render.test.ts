// @vitest-environment node
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { parseLayout } from './layout';
import { notoSansFromDisk } from './noto-sans.test-helper';
import { drawnType0Widths, textRuns, whiteRects } from './pdf-inspect.test-helper';
import { renderForm } from './render';

const INK = '0.10196 0.16471 0.42353'; // #1a2a6c

async function blankForm(pages = 2): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([595.5, 842.25]);
  return doc.save();
}

const layout = parseLayout(`
pdf: form.pdf
fields:
  nom:      {page: 0, x: 151, y: 506.7, w: 390}
  petit:    {page: 0, x: 100, y: 400, w: 20}
  dates:    {page: 0, x: 49.5, y: 227.4, w: 400, template: "Du {date_debut} au {date_fin}"}
  horaires: {page: 0, x: 49.5, y: 213.2, w: 400, template: "De {heure_debut} à {heure_fin}"}
  coche:    {page: 1, type: check, x: 168.9, y: 656.8}
  interet:  {page: 1, type: lines, x: 49.5, y: 282.2, w: 490, leading: 14.3, max_lines: 2}
`);

async function render(data: Record<string, unknown>) {
  return renderForm({ formPdf: await blankForm(), layout, data });
}

describe('renderForm: text fields', () => {
  it('draws the value at the baseline in ink colour, 10 pt Helvetica', async () => {
    const { pdf, problems } = await render({ nom: 'Soirée acoustique' });
    expect(await textRuns(pdf, 0)).toEqual([
      { text: 'Soirée acoustique', x: 151, y: 506.7, size: 10, bold: false, color: INK },
    ]);
    expect(problems).toEqual([]);
  });

  it('whites out the dotted leader under the field first', async () => {
    const { pdf } = await render({ nom: 'x' });
    expect(await whiteRects(pdf, 0)).toEqual([[150, 503.7, 392, 11.5]]);
  });

  it('draws nothing for missing or empty values', async () => {
    const { pdf } = await render({ nom: '' });
    expect(await textRuns(pdf, 0)).toEqual([]);
    expect(await whiteRects(pdf, 0)).toEqual([]);
  });

  it('draws numbers as text', async () => {
    const { pdf } = await render({ nom: 30 });
    expect((await textRuns(pdf, 0)).map((r) => r.text)).toEqual(['30']);
  });

  it('reports text wider than the field but still draws it', async () => {
    const { pdf, problems } = await render({ petit: 'much too long for twenty points' });
    expect((await textRuns(pdf, 0)).map((r) => r.text)).toEqual(['much too long for twenty points']);
    expect(problems).toEqual([{ field: 'petit', message: 'text wider than the field' }]);
  });
});

describe('renderForm: templates', () => {
  it('fills a template from several data keys', async () => {
    const { pdf } = await render({ date_debut: '12/12/2026', date_fin: '13/12/2026' });
    expect((await textRuns(pdf, 0)).map((r) => r.text)).toEqual(['Du 12/12/2026 au 13/12/2026']);
  });

  it('fills missing keys with nothing when at least one key is set', async () => {
    const { pdf } = await render({ heure_debut: '19 h 30' });
    expect((await textRuns(pdf, 0)).map((r) => r.text)).toEqual(['De 19 h 30 à']);
  });

  it('skips the field when all of its keys are empty', async () => {
    const { pdf } = await render({ date_debut: '', heure_fin: null });
    expect(await textRuns(pdf, 0)).toEqual([]);
  });
});

describe('renderForm: check fields', () => {
  it('draws a bold X offset into the box when the value is true', async () => {
    const { pdf } = await render({ coche: true });
    expect(await textRuns(pdf, 1)).toEqual([
      { text: 'X', x: 170.3, y: 657.4, size: 10, bold: true, color: INK },
    ]);
  });

  it('draws nothing unless the value is exactly true', async () => {
    for (const value of [false, 'true', 'yes', 1]) {
      const { pdf } = await render({ coche: value });
      expect(await textRuns(pdf, 1)).toEqual([]);
    }
  });
});

describe('renderForm: lines fields', () => {
  it('wraps onto lines spaced by the leading, each whited out', async () => {
    const words = Array.from({ length: 30 }, (_, i) => `mot${i}`).join(' ');
    const { pdf, problems } = await render({ interet: words });
    const runs = await textRuns(pdf, 1);
    expect(runs.map((r) => r.y)).toEqual([282.2, 267.9]);
    expect(runs.map((r) => r.text).join(' ')).toBe(words);
    expect((await whiteRects(pdf, 1)).map((r) => r[1])).toEqual([279.2, 264.9]);
    expect(problems).toEqual([]);
  });

  it('shrinks the font when needed to fit max_lines', async () => {
    // ~3 lines at 10 pt, fits in 2 lines somewhere above 7 pt
    const words = Array.from({ length: 50 }, (_, i) => `mot${i}`).join(' ');
    const { pdf } = await render({ interet: words });
    const runs = await textRuns(pdf, 1);
    expect(runs).toHaveLength(2);
    expect(runs[0].size).toBeLessThan(10);
    expect(runs[0].size).toBeGreaterThanOrEqual(7);
  });

  it('truncates at 7 pt and reports the overflow', async () => {
    const words = Array.from({ length: 200 }, (_, i) => `mot${i}`).join(' ');
    const { pdf, problems } = await render({ interet: words });
    const runs = await textRuns(pdf, 1);
    expect(runs).toHaveLength(2);
    expect(runs[0].size).toBe(7);
    expect(problems).toHaveLength(1);
    expect(problems[0].field).toBe('interet');
    expect(problems[0].message).toMatch(/^text too long \(\d+ lines, max 2\)$/);
  });
});

describe('renderForm: characters the font cannot draw', () => {
  it('replaces them with ? and reports them, instead of throwing', async () => {
    const { pdf, problems } = await render({ nom: 'Fête 🎉 Ω' });
    expect((await textRuns(pdf, 0)).map((r) => r.text)).toEqual(['Fête ? ?']);
    expect(problems).toEqual([{ field: 'nom', message: 'cannot draw "🎉", "Ω" in this font (replaced with ?)' }]);
  });

  it('composes accents typed as combining marks before drawing', async () => {
    const { pdf, problems } = await render({ nom: 'Soirée' });
    expect((await textRuns(pdf, 0)).map((r) => r.text)).toEqual(['Soirée']);
    expect(problems).toEqual([]);
  });

  it('checks template values and lines fields too', async () => {
    const { problems } = await render({ heure_debut: '19h ⏰', interet: 'Ω' });
    expect(problems.map((p) => p.field)).toEqual(['horaires', 'interet']);
  });

  it('checks the appendix and reports it as field "appendix"', async () => {
    const { problems } = await render({
      appendix: { title: 'Programme 🎶', columns: ['Titre'], rows: [['Ωδή']], outro: 'Ω' },
    });
    expect(problems).toEqual([{ field: 'appendix', message: 'cannot draw "🎶", "Ω", "δ", "ή" in this font (replaced with ?)' }]);
  });
});

describe('renderForm with Noto Sans', () => {
  const scripts = {
    french: 'Soirée à l’œuvre « ça » — Noël',
    cyrillic: 'Привет, мир',
    greek: 'Καλησπέρα σας',
    vietnamese: 'Tiếng Việt có dấu',
  };

  for (const [script, text] of Object.entries(scripts)) {
    it(`draws ${script} text without problems`, async () => {
      const { pdf, problems } = await renderForm({ formPdf: await blankForm(), layout, data: { nom: text }, fonts: notoSansFromDisk });
      expect(problems).toEqual([]);
      const [drawn] = await drawnType0Widths(pdf, 0);
      expect(drawn.glyphs).toBe([...text].length);
    });
  }

  it('reports an emoji, draws ? instead, and does not throw', async () => {
    const { pdf, problems } = await renderForm({
      formPdf: await blankForm(),
      layout,
      data: { nom: 'Fête 🎉' },
      fonts: notoSansFromDisk,
    });
    expect(problems).toEqual([{ field: 'nom', message: 'cannot draw "🎉" in this font (replaced with ?)' }]);
    expect((await drawnType0Widths(pdf, 0))[0].glyphs).toBe(6);
  });
});
