import { describe, expect, it } from 'vitest';
import { createAppState } from './state';
import { createDraftStore, loadLang, persistDraft, saveLang } from './storage';

/** In-memory Storage stand-in. */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  };
}

/** Storage that throws on every access (private mode, blocked site data). */
const brokenStorage = (): Storage =>
  new Proxy({} as Storage, {
    get() {
      throw new DOMException('denied', 'SecurityError');
    },
  });

describe('draft store', () => {
  it('saves, restores and clears the YAML draft', () => {
    const storage = memoryStorage();
    const store = createDraftStore('form-a', () => storage);
    expect(store.load()).toBeUndefined();
    store.save('nom: "Soirée"\n');
    expect(createDraftStore('form-a', () => storage).load()).toBe('nom: "Soirée"\n');
    expect(createDraftStore('form-b', () => storage).load()).toBeUndefined();
    store.clear();
    expect(store.load()).toBeUndefined();
  });

  it('never throws when storage is unavailable', () => {
    const store = createDraftStore('form-a', brokenStorage);
    expect(() => store.save('x: 1')).not.toThrow();
    expect(store.load()).toBeUndefined();
    expect(() => store.clear()).not.toThrow();
    const missing = createDraftStore('form-a', () => {
      throw new Error('no localStorage');
    });
    expect(missing.load()).toBeUndefined();
  });

  it('persistDraft saves every YAML change, and an emptied YAML removes the draft', () => {
    const storage = memoryStorage();
    const store = createDraftStore('form-a', () => storage);
    const state = createAppState();
    persistDraft(state, store);
    state.setYaml('lieu: "Cour"\n');
    expect(store.load()).toBe('lieu: "Cour"\n');
    state.setYaml('nom: [oops');
    expect(store.load()).toBe('nom: [oops');
    state.setYaml('   \n');
    expect(store.load()).toBeUndefined();
  });
});

describe('language preference', () => {
  it('defaults to English and remembers the choice', () => {
    const storage = memoryStorage();
    expect(loadLang(() => storage)).toBe('en');
    saveLang('fr', () => storage);
    expect(loadLang(() => storage)).toBe('fr');
  });

  it('ignores unknown stored values and broken storage', () => {
    const storage = memoryStorage();
    storage.setItem('ciup-form-helper:lang', 'de');
    expect(loadLang(() => storage)).toBe('en');
    expect(loadLang(brokenStorage)).toBe('en');
    expect(() => saveLang('fr', brokenStorage)).not.toThrow();
  });
});
