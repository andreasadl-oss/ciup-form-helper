import { parseDocument } from 'yaml';
import type { FillData } from './render';

export interface YamlError {
  message: string;
  /** 1-based line of the error, when the parser knows it. */
  line?: number;
  /** 1-based column of the error, when the parser knows it. */
  column?: number;
}

export type ParseResult = { ok: true; data: FillData } | { ok: false; error: YamlError };

export function parseYaml(text: string): ParseResult {
  const doc = parseDocument(text);
  const [first] = doc.errors;
  if (first) {
    const pos = first.linePos?.[0];
    return { ok: false, error: { message: first.message, line: pos?.line, column: pos?.col } };
  }
  const value: unknown = doc.toJS();
  if (value == null) return { ok: true, data: {} };
  if (typeof value !== 'object' || Array.isArray(value)) {
    const line = doc.contents?.range ? lineOf(text, doc.contents.range[0]) : 1;
    return {
      ok: false,
      error: { message: 'The YAML must be a list of "key: value" lines (for example  nom: "Soirée").', line, column: 1 },
    };
  }
  return { ok: true, data: value as FillData };
}

function lineOf(text: string, offset: number): number {
  return text.slice(0, offset).split('\n').length;
}

/** What every panel sees: the YAML text (source of truth) and its parse. */
export interface AppSnapshot {
  readonly yaml: string;
  readonly result: ParseResult;
}

/**
 * Who made a change, e.g. 'yaml-panel' or 'form-panel'. Lets a panel skip
 * re-rendering its own edit (and losing the cursor).
 */
export type ChangeOrigin = string | undefined;

export type Listener = (snapshot: AppSnapshot, origin: ChangeOrigin) => void;

/** App state hub: panels talk to each other only through this. */
export interface AppState {
  get(): AppSnapshot;
  /** Replace the YAML text; parses it and notifies subscribers if it changed. */
  setYaml(yaml: string, origin?: ChangeOrigin): void;
  /** Called after every change (not immediately). Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void;
}

export function createAppState(initialYaml = ''): AppState {
  let snapshot: AppSnapshot = { yaml: initialYaml, result: parseYaml(initialYaml) };
  const listeners = new Set<Listener>();
  return {
    get: () => snapshot,
    setYaml(yaml, origin) {
      if (yaml === snapshot.yaml) return;
      snapshot = { yaml, result: parseYaml(yaml) };
      for (const listener of [...listeners]) listener(snapshot, origin);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
