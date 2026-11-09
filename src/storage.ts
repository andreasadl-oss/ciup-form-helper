/**
 * localStorage helpers: the last YAML draft and the interface language.
 * Every access is wrapped in try/catch: storage can be missing or throw
 * (private mode, blocked site data), and the app must work without it.
 */
import type { Lang } from './i18n';
import type { AppState } from './state';

/** Returns the Storage to use; may throw (e.g. `() => window.localStorage`). */
export type StorageProvider = () => Storage;

const defaultStorage: StorageProvider = () => window.localStorage;
const PREFIX = 'ciup-form-helper:';
const LANG_KEY = `${PREFIX}lang`;

function read(storage: StorageProvider, key: string): string | undefined {
  try {
    return storage().getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

function write(storage: StorageProvider, key: string, value: string | undefined): void {
  try {
    if (value === undefined) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    // Storage unavailable or full: the draft just isn't remembered.
  }
}

export interface DraftStore {
  load(): string | undefined;
  save(yaml: string): void;
  clear(): void;
}

export function createDraftStore(formId: string, storage: StorageProvider = defaultStorage): DraftStore {
  const key = `${PREFIX}draft:${formId}`;
  return {
    load: () => read(storage, key),
    save: (yaml) => write(storage, key, yaml),
    clear: () => write(storage, key, undefined),
  };
}

/** Saves the YAML on every change; a blank YAML removes the draft. */
export function persistDraft(state: AppState, store: DraftStore): void {
  state.subscribe(({ yaml }) => (yaml.trim() === '' ? store.clear() : store.save(yaml)));
}

export function loadLang(storage: StorageProvider = defaultStorage): Lang {
  return read(storage, LANG_KEY) === 'fr' ? 'fr' : 'en';
}

export function saveLang(lang: Lang, storage: StorageProvider = defaultStorage): void {
  write(storage, LANG_KEY, lang);
}
