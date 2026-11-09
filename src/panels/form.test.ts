import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { afterEach, describe, expect, it } from 'vitest';
import { getFormDefinition } from '../forms/definition';
import { createAppState } from '../state';
import { mountFormPanel } from './form';

const def = getFormDefinition('ciup-demande-manifestation-2026');
const exampleYaml = readFileSync('reference/example-data.yaml', 'utf8');
const example = parse(exampleYaml) as Record<string, unknown>;

afterEach(() => {
  document.body.innerHTML = '';
});

function setup(initialYaml = '') {
  const root = document.createElement('section');
  document.body.append(root);
  const state = createAppState(initialYaml);
  const panel = mountFormPanel(root, state, def);
  const input = (key: string) => root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${key}"]`)!;
  const type = (key: string, value: string) => {
    const el = input(key);
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const click = (key: string) => (input(key) as HTMLInputElement).click();
  const checked = (key: string) => (input(key) as HTMLInputElement).checked;
  const data = () => {
    const { result } = state.get();
    if (!result.ok) throw new Error('state YAML is invalid');
    return result.data;
  };
  const button = (label: RegExp, scope: ParentNode = root) =>
    [...scope.querySelectorAll('button')].find((b) => label.test(b.textContent ?? ''))!;
  return { root, state, panel, input, type, click, checked, data, button };
}

describe('form panel', () => {
  it('generates an input per text field, a textarea per lines field, a checkbox per check field', () => {
    const { input } = setup();
    expect(input('maison').tagName).toBe('INPUT');
    expect(input('interet').tagName).toBe('TEXTAREA');
    expect((input('type_concert') as HTMLInputElement).type).toBe('checkbox');
  });

  it('shows template fields as inputs for their data keys', () => {
    const { input, root } = setup();
    for (const key of ['date_debut', 'date_fin', 'heure_debut', 'heure_fin']) expect(input(key)).not.toBeNull();
    expect(root.querySelector('[name="dates"]')).toBeNull();
  });

  it('groups fields by section, with EN labels', () => {
    const { root } = setup();
    const legends = [...root.querySelectorAll('fieldset.form-section > legend')].map((l) => l.textContent);
    expect(legends).toEqual(def.sections.map((s) => s.title.en));
    expect(root.textContent).toContain('House or service making the request');
  });

  it('fills the form from the YAML, and survives a data -> form -> data round trip', () => {
    const { input, checked, type, data, root } = setup(exampleYaml);
    expect(input('maison').value).toBe('Maison Exemple');
    expect(input('date_debut').value).toBe('12/12/2026');
    expect(checked('type_concert')).toBe(true);
    expect(checked('type_film')).toBe(false);
    expect(root.querySelector<HTMLInputElement>('[name="appendix.title"]')!.value).toBe(example.appendix && (example.appendix as { title: string }).title);

    // Any form edit rewrites the YAML from the form: everything else must survive.
    type('lieu', 'Salle B');
    type('lieu', 'Grand salon');
    expect(data()).toEqual(example);
  });

  it('writes form edits to the YAML with the form-panel origin', () => {
    const { state, type, click, data } = setup();
    const origins: unknown[] = [];
    state.subscribe((_, origin) => origins.push(origin));
    type('nom', 'Fête');
    click('entree_libre');
    expect(data()).toEqual({ nom: 'Fête', entree_libre: true });
    expect(origins).toEqual(['form-panel', 'form-panel']);
  });

  it('leaves unticked boxes and cleared text out of the YAML', () => {
    const { state, type, click } = setup('nom: "Fête"\nentree_libre: true\n');
    click('entree_libre');
    type('nom', '');
    expect(state.get().yaml).toBe('');
  });

  it('keeps keys the form does not know (validation flags them)', () => {
    const { type, data } = setup('nmo: "typo"\n');
    type('nom', 'Fête');
    expect(data()).toEqual({ nom: 'Fête', nmo: 'typo' });
  });

  it('treats radio-like groups as "one or none"', () => {
    const { click, checked, data } = setup();
    click('concert_ouvert_oui');
    click('concert_ouvert_non');
    expect(checked('concert_ouvert_oui')).toBe(false);
    expect(data()).toEqual({ concert_ouvert_non: true });
    click('concert_ouvert_non');
    expect(data()).toEqual({});
  });

  it('follows YAML edits made elsewhere', () => {
    const { state, input, checked } = setup('nom: "A"\ntype_film: true\n');
    state.setYaml('nom: "B"\n', 'yaml-panel');
    expect(input('nom').value).toBe('B');
    expect(checked('type_film')).toBe(false);
  });

  it('shows numbers from the YAML as text', () => {
    const { input } = setup('assis: 30\n');
    expect(input('assis').value).toBe('30');
  });

  it('while the YAML is invalid, keeps the last good values and does not overwrite the YAML', () => {
    const { state, root, input } = setup('nom: "A"\n');
    state.setYaml('nom: "A\n', 'yaml-panel');
    expect(input('nom').value).toBe('A');
    expect(root.querySelector('fieldset.form-body')!.hasAttribute('disabled')).toBe(true);
    expect(state.get().yaml).toBe('nom: "A\n');
    state.setYaml('nom: "C"\n', 'yaml-panel');
    expect(root.querySelector('fieldset.form-body')!.hasAttribute('disabled')).toBe(false);
    expect(input('nom').value).toBe('C');
  });

  it('date fields keep jj/mm/aaaa data and offer a date picker', () => {
    const { root, data } = setup();
    const picker = root.querySelector<HTMLInputElement>('[data-field="date_debut"] input[type="date"]')!;
    picker.value = '2026-12-24';
    picker.dispatchEvent(new Event('input', { bubbles: true }));
    expect(data()).toEqual({ date_debut: '24/12/2026' });
  });

  it('shows a date typed with one-digit day and month in the date picker', () => {
    const { root } = setup();
    const text = root.querySelector<HTMLInputElement>('[data-field="date_debut"] input[type="text"]')!;
    text.value = '1/3/2026';
    text.dispatchEvent(new Event('input', { bubbles: true }));
    expect(root.querySelector<HTMLInputElement>('[data-field="date_debut"] input[type="date"]')!.value).toBe('2026-03-01');
  });

  it('exposes a data-field hook with a warning slot for every data key and the appendix', () => {
    const { root, panel } = setup();
    for (const key of [...def.validKeys]) {
      const el = root.querySelector(`[data-field="${key}"]`);
      expect(el, key).not.toBeNull();
      expect(el!.querySelector('.field-warning'), key).not.toBeNull();
    }
    panel.setWarnings('nom', ['Too long', 'Contains TODO']);
    const slot = root.querySelector<HTMLElement>('[data-field="nom"] .field-warning')!;
    expect(slot.hidden).toBe(false);
    expect([...slot.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['Too long', 'Contains TODO']);
    expect(root.querySelector('[data-field="nom"]')!.classList.contains('has-warning')).toBe(true);
    panel.setWarnings('nom', []);
    expect(slot.hidden).toBe(true);
    expect(panel.fieldElement('nom')).toBe(root.querySelector('[data-field="nom"]'));
  });

  describe('appendix editor', () => {
    it('adds a programme page with the default columns and one empty row', () => {
      const { button, root, data, type } = setup();
      button(/add programme page/i).click();
      type('appendix.title', 'Programme : Fête');
      expect(data()).toEqual({
        appendix: {
          title: 'Programme : Fête',
          columns: def.appendix.example.columns,
          col_widths: def.appendix.example.col_widths,
          rows: [['', '', '']],
        },
      });
      expect(root.querySelectorAll('[data-field="appendix"] tbody tr')).toHaveLength(1);
    });

    it('edits cells, adds and removes rows', () => {
      const { root, button, data, type } = setup(exampleYaml);
      const appendix = () => data().appendix as { rows: string[][] };
      button(/add row/i).click();
      expect(appendix().rows).toHaveLength(3);
      type('appendix.rows.2.1', 'Hallelujah');
      expect(appendix().rows[2]).toEqual(['', 'Hallelujah', '']);
      const firstRow = root.querySelector('[data-field="appendix"] tbody tr')!;
      button(/remove/i, firstRow).click();
      expect(appendix().rows.map((r) => r[1])).toEqual(['La Vie en rose', 'Hallelujah']);
    });

    it('edits intro and outro, and removes the page', () => {
      const { button, data, type } = setup(exampleYaml);
      type('appendix.outro', 'Merci');
      expect((data().appendix as { outro: string }).outro).toBe('Merci');
      type('appendix.intro', '');
      expect(data().appendix).not.toHaveProperty('intro');
      button(/remove programme page/i).click();
      expect(data()).not.toHaveProperty('appendix');
    });
  });
  it('uses French labels and texts when lang is fr', () => {
    const root = document.createElement('section');
    mountFormPanel(root, createAppState(''), def, { lang: 'fr' });
    expect(root.querySelector('h2')!.textContent).toBe('Option B : remplir le formulaire');
    expect(root.textContent).toContain('Lieu (salle)');
    expect(root.textContent).toContain('Ajouter la page programme');
    expect(root.querySelector('.date-picker')!.getAttribute('aria-label')).toMatch(/ : choisir une date$/);
  });
});
