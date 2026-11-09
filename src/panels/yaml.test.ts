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
    const { root, state, textarea } = setup('nom: a\n');
    const button = [...root.querySelectorAll('button')].find((b) => /example/i.test(b.textContent ?? ''))!;
    button.click();
    expect(textarea.value).toBe('nom: "Exemple"\n');
    expect(state.get().result).toEqual({ ok: true, data: { nom: 'Exemple' } });
  });
});
