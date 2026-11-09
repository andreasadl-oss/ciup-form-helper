// @vitest-environment node
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import type { Appendix } from './appendix';
import { parseLayout } from './layout';
import { textRuns, type TextRun } from './pdf-inspect.test-helper';
import { renderForm } from './render';

const BLACK = '0.00000 0.00000 0.00000';
const layout = parseLayout('pdf: form.pdf\nfields:\n  nom: {page: 0, x: 151, y: 506.7, w: 390}\n');

async function render(appendix?: Appendix | null) {
  const form = await PDFDocument.create();
  form.addPage([595.5, 842.25]);
  form.addPage([595.5, 842.25]);
  const { pdf } = await renderForm({ formPdf: await form.save(), layout, data: { nom: 'x', appendix } });
  return pdf;
}

async function pageCount(pdf: Uint8Array) {
  return (await PDFDocument.load(pdf)).getPageCount();
}

/** Values from reference/example-output.pdf, page 3 (reportlab output). */
const programme: Appendix = {
  title: 'Programme : Soirée acoustique des résidents',
  intro: 'Trois résidents (guitare, chant, violon). Durée : environ 45 minutes.',
  columns: ['#', 'Titre', 'Compositeur(s) / auteur(s)'],
  col_widths: [25, 170, 300],
  rows: [
    ['1', 'Autumn Leaves', 'Joseph Kosma / Jacques Prévert'],
    ['2', 'La Vie en rose', 'Louiguy / Édith Piaf'],
  ],
};

function at(runs: TextRun[], text: string): TextRun {
  const run = runs.find((r) => r.text === text);
  if (!run) throw new Error(`no run "${text}" in ${JSON.stringify(runs.map((r) => r.text))}`);
  return run;
}

describe('appendix page', () => {
  it('adds no page without an appendix', async () => {
    expect(await pageCount(await render())).toBe(2);
    expect(await pageCount(await render(null))).toBe(2);
  });

  it('adds one A4 page after the form pages', async () => {
    const doc = await PDFDocument.load(await render(programme));
    expect(doc.getPageCount()).toBe(3);
    const { width, height } = doc.getPage(2).getSize();
    expect(width).toBeCloseTo(595.2756, 3);
    expect(height).toBeCloseTo(841.8898, 3);
  });

  it('places title, intro and table where reportlab does', async () => {
    const runs = await textRuns(await render(programme), 2);

    const title = at(runs, programme.title);
    expect(title).toMatchObject({ size: 18, bold: true, color: BLACK });
    expect(title.y).toBeCloseTo(745.89, 1);
    expect(title.x).toBeCloseTo(56 + 45.57, 0); // centred in the frame

    const intro = at(runs, programme.intro!);
    expect(intro).toMatchObject({ size: 10, bold: false, x: 56 });
    expect(intro.y).toBeCloseTo(725.89, 1);

    // Header row: bold, cell text 6 pt in from each column edge.
    for (const [text, x] of [['#', 62], ['Titre', 87], ['Compositeur(s) / auteur(s)', 257]] as const) {
      const cell = at(runs, text);
      expect(cell).toMatchObject({ bold: true, size: 10, x });
      expect(cell.y).toBeCloseTo(698.89, 1);
    }
    expect(at(runs, 'Autumn Leaves')).toMatchObject({ bold: false, x: 87 });
    expect(at(runs, 'Autumn Leaves').y).toBeCloseTo(678.89, 1);
    expect(at(runs, 'Louiguy / Édith Piaf').y).toBeCloseTo(658.89, 1);
  });

  it('wraps a long cell inside its column and grows the row', async () => {
    const long = 'Une très longue description de morceau qui ne tient pas sur une seule ligne du tableau';
    const runs = await textRuns(
      await render({ ...programme, intro: undefined, rows: [['1', long, 'A'], ['2', 'Court', 'B']] }),
      2,
    );
    const headerY = at(runs, 'Titre').y;
    const lines = runs.filter((r) => r.x === 87 && r.y < headerY);
    const longLines = lines.slice(0, -1);
    expect(longLines.length).toBeGreaterThan(1);
    expect(longLines.map((r) => r.text).join(' ')).toBe(long);
    longLines.slice(1).forEach((r, i) => expect(longLines[i].y - r.y).toBeCloseTo(12, 5));
    // The next row starts below the last wrapped line.
    expect(at(runs, 'Court').y).toBeLessThan(longLines[longLines.length - 1].y - 12);
  });

  it('draws the optional outro below the table', async () => {
    const runs = await textRuns(await render({ ...programme, outro: 'Merci.' }), 2);
    const outro = at(runs, 'Merci.');
    expect(outro.x).toBe(56);
    // table bottom 651.89, spacer 12, then a 10 pt line
    expect(outro.y).toBeCloseTo(651.89 - 12 - 10, 1);
  });

  it('continues a long table on further pages', async () => {
    const rows = Array.from({ length: 60 }, (_, i) => [String(i + 1), `Morceau ${i + 1}`, 'Auteur']);
    const pdf = await render({ ...programme, rows });
    expect(await pageCount(pdf)).toBe(4);
    const all = [...(await textRuns(pdf, 2)), ...(await textRuns(pdf, 3))];
    expect(rows.every(([, title]) => all.some((r) => r.text === title))).toBe(true);
    for (const r of await textRuns(pdf, 3)) expect(r.y).toBeGreaterThan(72);
  });
});
