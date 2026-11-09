import { afterEach, describe, expect, it } from 'vitest';
import { createAppState } from '../state';
import { mountYamlPanel } from './yaml';

afterEach(() => {
  document.body.innerHTML = '';
});

function setup(initialYaml = '') {
  const root = document.createElement('section');
  document.body.append(root);
  const state = createAppState(initialYaml);
  mountYamlPanel(root, state, { exampleYaml: 'nom: "Exemple"\n' });
  const textarea = root.querySelector('textarea')!;
  const type = (text: string) => {
    textarea.value = text;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const errorText = () => root.querySelector<HTMLElement>('[role="alert"]')?.textContent ?? '';
  return { root, state, textarea, type, errorText };
}

describe('yaml panel', () => {
  it('sends typed YAML to the app state', () => {
    const { state, type } = setup();
    const origins: unknown[] = [];
    state.subscribe((_, origin) => origins.push(origin));
    type('lieu: "Grand salon"\n');
    expect(state.get().result).toEqual({ ok: true, data: { lieu: 'Grand salon' } });
    expect(origins).toEqual(['yaml-panel']);
  });

  it('shows the parse error with its line number, and clears it once fixed', () => {
    const { type, errorText } = setup();
    type('nom: "Soirée"\nlieu: Salon: grand\n');
    expect(errorText()).toMatch(/line 2/i);
    expect(errorText()).toMatch(/nested mappings/i);
    type('nom: "Soirée"\nlieu: "Salon: grand"\n');
    expect(errorText()).toBe('');
  });

  it('shows the initial YAML and its error', () => {
    const { textarea, errorText } = setup('nom: a\nnom: b\n');
    expect(textarea.value).toBe('nom: a\nnom: b\n');
    expect(errorText()).toMatch(/line 2/i);
  });

  it('follows YAML changes made elsewhere (e.g. the web form)', () => {
    const { state, textarea } = setup();
    state.setYaml('lieu: "Cour"\n', 'form-panel');
    expect(textarea.value).toBe('lieu: "Cour"\n');
  });

  it('"Load example" puts the example YAML in the textarea and the state', () => {
    const { root, state, textarea } = setup();
    const button = [...root.querySelectorAll('button')].find((b) => /example/i.test(b.textContent ?? ''))!;
    button.click();
    expect(textarea.value).toBe('nom: "Exemple"\n');
    expect(state.get().result).toEqual({ ok: true, data: { nom: 'Exemple' } });
  });

  it('"Load example" asks before replacing YAML the user already has', () => {
    const root = document.createElement('section');
    const state = createAppState('nom: "Mon concert"\n');
    const questions: string[] = [];
    const answers = [false, true];
    mountYamlPanel(root, state, {
      exampleYaml: 'nom: "Exemple"\n',
      confirm: (q) => (questions.push(q), answers.shift()!),
    });
    const button = [...root.querySelectorAll('button')].find((b) => /example/i.test(b.textContent ?? ''))!;
    button.click();
    expect(state.get().yaml).toBe('nom: "Mon concert"\n');
    button.click();
    expect(state.get().yaml).toBe('nom: "Exemple"\n');
    expect(questions).toEqual([expect.stringMatching(/^Replace your YAML with the example\?/), expect.anything()]);
    // Already showing the example: nothing to lose, no question.
    button.click();
    expect(questions).toHaveLength(2);
  });

  it('says that pasting is enough, with no button to press', () => {
    const { root, textarea } = setup();
    const hint = root.querySelector('#yaml-hint')!;
    expect(hint.textContent).toMatch(/update as you paste/);
    expect(textarea.getAttribute('aria-describedby')).toContain('yaml-hint');
  });
  it('shows French texts when lang is fr, including the error position', () => {
    const root = document.createElement('section');
    const state = createAppState('nom: a\nnom: b\n');
    mountYamlPanel(root, state, { exampleYaml: '', lang: 'fr' });
    expect(root.querySelector('label')!.textContent).toBe('Collez le YAML ici');
    expect(root.querySelector('[role="alert"]')!.textContent).toMatch(/^Ligne 2, colonne \d+: /);
    state.setYaml('- a\n- b\n');
    expect(root.querySelector('[role="alert"]')!.textContent).toMatch(/Le YAML doit être une liste/);
  });

  describe('clear draft button', () => {
    it('is shown only when a clearDraft callback is given', () => {
      const { root } = setup();
      expect(root.textContent).not.toMatch(/clear draft/i);
    });

    it('after confirmation, empties the YAML and calls clearDraft', () => {
      const root = document.createElement('section');
      const state = createAppState('nom: a\n');
      let cleared = 0;
      const answers = [false, true];
      mountYamlPanel(root, state, { exampleYaml: '', clearDraft: () => cleared++, confirm: () => answers.shift()! });
      const button = [...root.querySelectorAll('button')].find((b) => /clear draft/i.test(b.textContent ?? ''))!;
      button.click();
      expect(state.get().yaml).toBe('nom: a\n');
      expect(cleared).toBe(0);
      button.click();
      expect(state.get().yaml).toBe('');
      expect(root.querySelector('textarea')!.value).toBe('');
      expect(cleared).toBe(1);
    });
  });
});
