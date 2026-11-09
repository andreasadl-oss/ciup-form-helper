import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { getFormDefinition } from '../forms/definition';
import { getForm } from '../forms/registry';
import { createFontMetrics, parseLayout, renderForm } from '../render';
import { notoSansFromDisk } from '../render/noto-sans.test-helper';
import { validate, type Warning } from './validate';

const def = getFormDefinition('ciup-demande-manifestation-2026');
const example = parse(readFileSync('reference/example-data.yaml', 'utf8')) as Record<string, unknown>;
/** The example event is on 12/12/2026: 41 days after this. */
const TODAY = new Date(2026, 10, 1);

const run = (changes: Record<string, unknown>, today = TODAY) => {
  const data = { ...example, ...changes };
  for (const [k, v] of Object.entries(changes)) if (v === undefined) delete data[k];
  return validate(data, def, today);
};
const brief = (ws: Warning[]) => ws.map((w) => ({ key: w.key, message: w.message, params: w.params }));

describe('validate', () => {
  it('finds nothing wrong with the example request', () => {
    expect(run({})).toEqual([]);
  });

  it('suggests the closest valid key for an unknown key', () => {
    expect(brief(run({ date_debt: '12/12/2026' }))).toEqual([
      { key: 'date_debt', message: 'unknownKey', params: { key: 'date_debt', suggestion: 'date_debut' } },
    ]);
  });

  it('gives no suggestion when no valid key is close to the unknown one', () => {
    expect(brief(run({ couleur: 'bleu' }))).toEqual([{ key: 'couleur', message: 'unknownKey', params: { key: 'couleur' } }]);
  });

  it('flags TODO values, including inside the programme page', () => {
    const appendix = { ...(example.appendix as object), rows: [['1', 'TODO titre', 'x']] };
    expect(brief(run({ lieu: 'TODO salle', appendix }))).toEqual([
      { key: 'lieu', message: 'todo', params: {} },
      { key: 'appendix', message: 'todo', params: {} },
    ]);
  });

  describe('dates', () => {
    it('warns prominently when the start date is less than the deadline away', () => {
      const ws = run({}, new Date(2026, 10, 22)); // 20 days before 12/12
      expect(ws).toEqual([
        { key: 'date_debut', severity: 'high', message: 'tooSoon', params: { days: 20, deadlineDays: 21 } },
      ]);
    });

    it('accepts a start date exactly the deadline away', () => {
      expect(run({}, new Date(2026, 10, 21, 23, 30))).toEqual([]);
    });

    it('warns on each date in the past (and not also "too soon")', () => {
      expect(brief(run({ date_debut: '01/10/2026', date_fin: '01/10/2026' }))).toEqual([
        { key: 'date_debut', message: 'datePast', params: {} },
        { key: 'date_fin', message: 'datePast', params: {} },
      ]);
    });

    it('warns about a past end date even when the start date is fine', () => {
      expect(brief(run({ date_fin: '01/10/2026' }))).toEqual([
        { key: 'date_fin', message: 'datePast', params: {} },
        { key: 'date_fin', message: 'endBeforeStart', params: {} },
      ]);
    });

    it('does not treat the end date as the start when the start date is missing', () => {
      expect(brief(run({ date_debut: undefined }, new Date(2026, 11, 1)))).toEqual([]);
      expect(brief(run({ date_debut: undefined, date_fin: '01/10/2026' }))).toEqual([
        { key: 'date_fin', message: 'datePast', params: {} },
      ]);
    });

    it('warns when the end date is before the start date', () => {
      expect(brief(run({ date_fin: '11/12/2026' }))).toEqual([
        { key: 'date_fin', message: 'endBeforeStart', params: {} },
      ]);
    });

    it('warns about dates not written jj/mm/aaaa, or that do not exist', () => {
      expect(brief(run({ date_debut: '2026-12-12', date_fin: '31/02/2027' }))).toEqual([
        { key: 'date_debut', message: 'badDate', params: { value: '2026-12-12' } },
        { key: 'date_fin', message: 'badDate', params: { value: '31/02/2027' } },
      ]);
    });

    it('leaves TODO dates to the TODO warning', () => {
      expect(brief(run({ date_fin: 'TODO date' }))).toEqual([{ key: 'date_fin', message: 'todo', params: {} }]);
    });
  });

  describe('contradictions', () => {
    it('warns when more than one box of a oui / non group is ticked', () => {
      expect(brief(run({ concert_ouvert_non: true }))).toEqual([
        { key: 'concert_ouvert_oui', message: 'groupConflict', params: { fields: 'concert_ouvert_oui, concert_ouvert_non' } },
      ]);
    });

    it('accepts an artist paid both as intermittent and through an association', () => {
      const paid = { remunere_non: undefined, remunere_oui: true, tiers_nom: 'Association Exemple' };
      expect(run({ ...paid, remunere_intermittent: true, remunere_association: true })).toEqual([]);
    });

    it('warns when "Concert" is ticked without a programme page', () => {
      expect(brief(run({ appendix: undefined }))).toEqual([{ key: 'type_concert', message: 'concertNoAppendix', params: {} }]);
      expect(run({ appendix: undefined, type_concert: undefined, concert_ouvert_oui: undefined })).toEqual([]);
    });

    it('treats a programme page without any filled-in row as missing', () => {
      // What "Add programme page" in the web form creates.
      const fresh = { title: '', columns: ['#', 'Titre', 'Compositeur(s) / auteur(s)'], rows: [['', '', ''], [' ', '', '']] };
      expect(brief(run({ appendix: fresh }))).toEqual([{ key: 'type_concert', message: 'concertNoAppendix', params: {} }]);
    });

    it('warns when "Payante" is ticked', () => {
      expect(brief(run({ entree_gratuite: undefined, entree_payante: true }))).toEqual([
        { key: 'entree_payante', message: 'paidEntry', params: {} },
      ]);
    });

    it('warns when the artist is paid but section 5 is empty', () => {
      const paid = { remunere_non: undefined, remunere_oui: true };
      expect(brief(run(paid))).toEqual([{ key: 'remunere_oui', message: 'paidNoThirdParty', params: {} }]);
      expect(run({ ...paid, tiers_nom: 'Association Exemple' })).toEqual([]);
    });
  });

  describe('with the layout and font (text fit, glyphs)', async () => {
    const layout = parseLayout(getForm('ciup-demande-manifestation-2026').layoutYaml);
    const metrics = await createFontMetrics(notoSansFromDisk);
    const runFull = (changes: Record<string, unknown>) =>
      validate({ ...example, ...changes }, def, TODAY, { layout, metrics });

    it('finds nothing wrong with the example request', () => {
      expect(runFull({})).toEqual([]);
    });

    it('warns when a text field is wider than its box', () => {
      expect(brief(runFull({ nom: 'W'.repeat(60) }))).toEqual([{ key: 'nom', message: 'tooWide', params: {} }]);
    });

    it('puts a too-wide template field on its first data key', () => {
      expect(brief(runFull({ heure_debut: 'W'.repeat(40) }))).toEqual([
        { key: 'heure_debut', message: 'tooWide', params: {} },
      ]);
    });

    it('warns when a lines field still overflows at the minimum size', () => {
      const ws = runFull({ interet: 'mot '.repeat(400) });
      expect(ws).toHaveLength(1);
      expect(ws[0]).toMatchObject({ key: 'interet', message: 'tooLong', params: { maxLines: 4 } });
      expect(ws[0].params.lines).toBeGreaterThan(4);
    });

    it('agrees with the renderer on what overflows, around the limit', async () => {
      const formPdf = new Uint8Array(readFileSync('forms/ciup-demande-manifestation-2026/form.pdf'));
      const words = 'Concert acoustique proposé par trois résidents musiciens, office, affluence'.split(' ');
      const seen = new Set<boolean>();
      for (let n = 40; n <= 120; n += 3) {
        const interet = Array.from({ length: n }, (_, i) => words[i % words.length]).join(' ');
        const { problems } = await renderForm({ formPdf, layout, data: { interet }, fonts: notoSansFromDisk });
        const rendered = problems.some((p) => p.field === 'interet');
        const validated = runFull({ interet }).some((w) => w.message === 'tooLong');
        expect(validated, `${n} words`).toBe(rendered);
        seen.add(rendered);
      }
      expect(seen).toEqual(new Set([true, false])); // the range spans the limit
    }, 60_000);

    it('accepts a lines field that fits only after shrinking', () => {
      expect(runFull({ interet: 'mot '.repeat(120) })).toEqual([]);
    });

    it('lists characters the font cannot draw, per data key and in the programme page', () => {
      const appendix = { ...(example.appendix as object), rows: [['1', 'Song ⟨x⟩', '🎸']] };
      expect(brief(runFull({ nom: 'Soirée 🎸🎸', appendix }))).toEqual([
        { key: 'nom', message: 'unsupportedChars', params: { chars: '🎸' } },
        { key: 'appendix', message: 'unsupportedChars', params: { chars: '⟨ ⟩ 🎸' } },
      ]);
    });

    it('accepts names in scripts Noto Sans covers', () => {
      expect(runFull({ nom: 'Ζωή Ольга Nguyễn' })).toEqual([]);
    });
  });
});
