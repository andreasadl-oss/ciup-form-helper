import { describe, expect, it } from 'vitest';
import { createAppState, parseYaml } from './state';

describe('parseYaml', () => {
  it('returns the data of a YAML mapping', () => {
    expect(parseYaml('nom: "Soirée"\ntype_concert: true\n')).toEqual({
      ok: true,
      data: { nom: 'Soirée', type_concert: true },
    });
  });

  it('reports a syntax error with its 1-based line and column', () => {
    // An unquoted colon in a value, a typical hand/LLM mistake.
    const result = parseYaml('nom: "Soirée"\nlieu: Salon: grand\nassis: 30\n');
    expect(result).toMatchObject({ ok: false, error: { line: 2, column: 7 } });
    if (!result.ok) expect(result.error.message).toMatch(/nested mappings/i);
  });

  it('rejects duplicate keys, reporting the second one', () => {
    expect(parseYaml('nom: a\nnom: b\n')).toMatchObject({ ok: false, error: { line: 2 } });
  });

  it('treats empty text as no data', () => {
    expect(parseYaml('')).toEqual({ ok: true, data: {} });
    expect(parseYaml('# only a comment\n')).toEqual({ ok: true, data: {} });
  });

  it('rejects YAML whose top level is not a key: value mapping', () => {
    for (const text of ['just a sentence', '- a\n- b\n']) {
      const result = parseYaml(text);
      expect(result).toMatchObject({ ok: false, error: { line: 1 } });
      if (!result.ok) expect(result.error.message).toMatch(/key: value/);
    }
  });
});

describe('createAppState', () => {
  it('starts from the given YAML, parsed', () => {
    const state = createAppState('nom: "Soirée"\n');
    expect(state.get()).toEqual({ yaml: 'nom: "Soirée"\n', result: { ok: true, data: { nom: 'Soirée' } } });
    expect(createAppState().get()).toEqual({ yaml: '', result: { ok: true, data: {} } });
  });

  it('parses new YAML and tells subscribers who changed it', () => {
    const state = createAppState();
    const seen: unknown[] = [];
    state.subscribe((snapshot, origin) => seen.push([snapshot, origin]));

    state.setYaml('lieu: "Grand salon"\n', 'yaml-panel');
    state.setYaml('lieu: a: b\n');

    expect(seen).toEqual([
      [{ yaml: 'lieu: "Grand salon"\n', result: { ok: true, data: { lieu: 'Grand salon' } } }, 'yaml-panel'],
      [{ yaml: 'lieu: a: b\n', result: expect.objectContaining({ ok: false }) }, undefined],
    ]);
    expect(state.get().yaml).toBe('lieu: a: b\n');
  });

  it('does not notify when the YAML text is unchanged', () => {
    const state = createAppState('nom: a\n');
    let calls = 0;
    state.subscribe(() => calls++);
    state.setYaml('nom: a\n');
    expect(calls).toBe(0);
  });

  it('stops notifying after unsubscribe', () => {
    const state = createAppState();
    let calls = 0;
    const unsubscribe = state.subscribe(() => calls++);
    state.setYaml('nom: a\n');
    unsubscribe();
    state.setYaml('nom: b\n');
    expect(calls).toBe(1);
  });
});
