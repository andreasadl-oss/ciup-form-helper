/**
 * Data → YAML text, for edits made in the web form (the YAML text stays the
 * source of truth, see `src/state.ts`).
 *
 * Keys come out in form order, one blank line between sections, unknown keys
 * last (kept so validation can still point at them). Unticked checkboxes and
 * empty values are left out, as the data contract requires.
 */
import { Document, isMap, isSeq, YAMLMap, type Node, type Pair, type Scalar } from 'yaml';
import { isBlank } from '../values';
import type { FormDefinition } from './definition';

/** Data keys in form order, each with the section it belongs to. */
function orderedKeys(def: FormDefinition): { key: string; section: string }[] {
  const keys = def.fields.flatMap((f) => f.dataKeys.map((k) => ({ key: k.key, section: f.section })));
  keys.push({ key: def.appendix.key, section: def.appendix.section });
  return keys;
}

export function dataToYaml(def: FormDefinition, data: Record<string, unknown>): string {
  const known = orderedKeys(def);
  const knownSet = new Set(known.map((k) => k.key));
  const entries: { key: string; value: unknown; section: string | undefined }[] = [];
  for (const { key, section } of known) {
    if (key in data && !isBlank(data[key])) entries.push({ key, value: data[key], section });
  }
  for (const [key, value] of Object.entries(data)) {
    if (!knownSet.has(key)) entries.push({ key, value, section: undefined });
  }
  if (entries.length === 0) return '';

  const doc = new Document(Object.fromEntries(entries.map((e) => [e.key, e.value])));
  const map = doc.contents as YAMLMap<Scalar, Node>;
  map.items.forEach((pair: Pair<Scalar, Node>, i) => {
    if (i > 0 && entries[i].section !== entries[i - 1].section) pair.key.spaceBefore = true;
  });

  const appendix = doc.get(def.appendix.key, true);
  if (isMap(appendix)) {
    for (const name of ['columns', 'col_widths']) {
      const seq = appendix.get(name, true);
      if (isSeq(seq)) seq.flow = true;
    }
    const rows = appendix.get('rows', true);
    if (isSeq(rows)) for (const row of rows.items) if (isSeq(row)) row.flow = true;
  }

  return doc.toString({ defaultStringType: 'QUOTE_DOUBLE', defaultKeyType: 'PLAIN', lineWidth: 0 });
}
