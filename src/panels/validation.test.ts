import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { getFormDefinition } from '../forms/definition';
import { getForm } from '../forms/registry';
import { createFontMetrics, parseLayout } from '../render';
import { notoSansFromDisk } from '../render/noto-sans.test-helper';
import { createAppState } from '../state';
import { mountFormPanel } from './form';
import { mountNotices } from './notices';
import { connectValidation } from './validation';

const FORM_ID = 'ciup-demande-manifestation-2026';
const def = getFormDefinition(FORM_ID);
const layout = parseLayout(getForm(FORM_ID).layoutYaml);
const exampleYaml = readFileSync('reference/example-data.yaml', 'utf8');
/** 20 days before the example's 12/12/2026. */
const today = () => new Date(2026, 10, 22);

afterEach(() => {
  document.body.innerHTML = '';
});

function setup(yaml: string, metrics = createFontMetrics(notoSansFromDisk)) {
  const noticesRoot = document.createElement('div');
  const formRoot = document.createElement('section');
  document.body.append(noticesRoot, formRoot);
  const state = createAppState(yaml);
  const formPanel = mountFormPanel(formRoot, state, def);
  const notices = mountNotices(noticesRoot);
  connectValidation(state, { def, layout, metrics, formPanel, notices, today });
  const summary = () => [...noticesRoot.querySelectorAll('.notice-summary li')].map((li) => li.textContent);
  const fieldWarnings = (key: string) =>
    [...formPanel.fieldElement(key)!.querySelectorAll('.field-warning li')].map((li) => li.textContent);
  return { state, summary, fieldWarnings, noticesRoot };
}

describe('connectValidation', () => {
  it('shows warnings next to fields and in the summary, the deadline one first', async () => {
    const { summary, fieldWarnings } = setup(exampleYaml.replace('lieu: "Grand salon"', 'lieu: "TODO salle"'));
    expect(fieldWarnings('lieu')).toEqual(['Still contains TODO: fill this in.']);
    expect(fieldWarnings('date_debut')[0]).toMatch(/in 20 days.*may refuse late requests/);
    expect(summary()).toEqual([
      expect.stringMatching(/^Start date: The event is in 20 days/),
      'Room: Still contains TODO: fill this in.',
    ]);
  });

  it('uses French labels and messages when lang is fr', () => {
    const noticesRoot = document.createElement('div');
    const formRoot = document.createElement('section');
    document.body.append(noticesRoot, formRoot);
    const state = createAppState(exampleYaml.replace('lieu: "Grand salon"', 'lieu: "TODO salle"'));
    const formPanel = mountFormPanel(formRoot, state, def, { lang: 'fr' });
    const notices = mountNotices(noticesRoot);
    connectValidation(state, { def, layout, metrics: new Promise(() => {}), formPanel, notices, today, lang: 'fr' });
    const summary = [...noticesRoot.querySelectorAll('.notice-summary li')].map((li) => li.textContent);
    expect(summary).toContain('Lieu (salle): Contient encore TODO : à compléter.');
  });

  it('updates on every change and clears fixed warnings', () => {
    const { state, summary, fieldWarnings } = setup(exampleYaml);
    state.setYaml(`${exampleYaml}\nentree_payante: true\n`);
    expect(fieldWarnings('entree_payante')).toHaveLength(1);
    expect(fieldWarnings('entree_gratuite')).toEqual([expect.stringMatching(/Tick only one/)]);
    state.setYaml(exampleYaml);
    expect(fieldWarnings('entree_payante')).toEqual([]);
    expect(summary()).toHaveLength(1); // only the deadline warning remains
  });

  it('lists unknown keys in the summary (they have no field)', () => {
    const { summary } = setup(`${exampleYaml}\nnon: "x"\n`);
    expect(summary()).toContain('Unknown key "non". Did you mean "nom"?');
  });

  it('adds the font checks once the font has loaded', async () => {
    let resolve!: (m: Awaited<ReturnType<typeof createFontMetrics>>) => void;
    const metrics = new Promise<Awaited<ReturnType<typeof createFontMetrics>>>((r) => (resolve = r));
    const { fieldWarnings } = setup(exampleYaml.replace('Soirée acoustique des résidents"', 'Soirée 🎸"'), metrics);
    expect(fieldWarnings('nom')).toEqual([]);
    resolve(await createFontMetrics(notoSansFromDisk));
    await metrics;
    await Promise.resolve();
    expect(fieldWarnings('nom')).toEqual([expect.stringMatching(/can't be printed.*🎸/)]);
  });

  it('shows no warnings while the YAML is invalid', () => {
    const { state, summary } = setup(exampleYaml);
    state.setYaml('nom: [unclosed');
    expect(summary()).toEqual([]);
  });
});
