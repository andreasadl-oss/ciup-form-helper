/**
 * Validation: warnings about the data, never hard blocks (only invalid YAML
 * blocks the download, see `src/state.ts`). Pure: `today` is injected.
 *
 * Warnings carry a message key + params, not text: turn them into text with
 * `formatWarning` (`./messages`), so the UI can translate them.
 */
import type { FormDefinition } from '../forms/definition';
import { appendixHasRows, dataKeysOf, fieldText, fitLines, type FontMetrics, type Layout } from '../render';

export type Severity = 'high' | 'normal';

export interface Warning {
  /** Data key (or `appendix`) the warning is about; for an unknown key, that key. */
  key: string;
  severity: Severity;
  message: MessageKey;
  params: Record<string, string | number>;
}

export type MessageKey = 'unknownKey' | 'todo' | 'badDate' | 'datePast' | 'tooSoon'
  | 'endBeforeStart'
  | 'groupConflict'
  | 'concertNoAppendix'
  | 'paidEntry'
  | 'paidNoThirdParty'
  | 'tooWide'
  | 'tooLong'
  | 'unsupportedChars';

type Data = Record<string, unknown>;

export interface ValidateOptions {
  /** Field boxes, for the "text doesn't fit" checks (needs `metrics` too). */
  layout?: Layout;
  /** The font the PDF is drawn with, for text fit and "can't draw" checks. Skipped when absent (e.g. still loading). */
  metrics?: FontMetrics;
}

/** `today` is read in local time: only its calendar date matters. */
export function validate(data: Data, def: FormDefinition, today: Date, options: ValidateOptions = {}): Warning[] {
  const warnings: Warning[] = [];
  const add = (key: string, message: MessageKey, params: Warning['params'] = {}, severity: Severity = 'normal') =>
    warnings.push({ key, severity, message, params });

  const valid = new Set(def.validKeys);
  for (const key of Object.keys(data)) {
    if (valid.has(key)) continue;
    const suggestion = closest(key, def.validKeys);
    add(key, 'unknownKey', suggestion === undefined ? { key } : { key, suggestion });
  }

  for (const [key, value] of Object.entries(data)) {
    if (strings(value).some((s) => s.includes('TODO'))) add(key, 'todo');
  }

  // Dates: the form's first date key is the start, its last one the end. Each past date is flagged on its own key.
  const dateKeys = def.fields.flatMap((f) => f.dataKeys).filter((k) => k.format === 'date').map((k) => k.key);
  const startKey = dateKeys[0];
  const endKey = dateKeys.length > 1 ? dateKeys[dateKeys.length - 1] : undefined;
  const todayNumber = dayNumber(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const days = new Map<string, number>();
  for (const key of dateKeys) {
    const value = data[key];
    if (isBlank(value) || String(value).includes('TODO')) continue;
    const day = parseDate(String(value));
    if (day === undefined) {
      add(key, 'badDate', { value: String(value) });
      continue;
    }
    days.set(key, day);
    const ahead = day - todayNumber;
    if (ahead < 0) add(key, 'datePast', {}, 'high');
    else if (key === startKey && ahead < def.deadlineDays) add(key, 'tooSoon', { days: ahead, deadlineDays: def.deadlineDays }, 'high');
  }
  const start = days.get(startKey);
  const end = endKey === undefined ? undefined : days.get(endKey);
  if (start !== undefined && end !== undefined && end < start) add(endKey!, 'endBeforeStart');

  // Contradictions.
  const ticked = (key: string) => data[key] === true;
  for (const group of def.groups) {
    const on = group.fields.filter(ticked);
    if (on.length > 1) add(on[0], 'groupConflict', { fields: on.join(', ') });
  }
  const has = (key: string) => valid.has(key);
  if (has(RULES.concert) && ticked(RULES.concert) && !appendixHasRows(data[def.appendix.key])) add(RULES.concert, 'concertNoAppendix');
  if (has(RULES.paidEntry) && ticked(RULES.paidEntry)) add(RULES.paidEntry, 'paidEntry');
  if (has(RULES.paidArtist) && ticked(RULES.paidArtist)) {
    const thirdParty = def.fields.filter((f) => f.section === RULES.thirdPartySection).flatMap((f) => f.dataKeys);
    if (thirdParty.length > 0 && thirdParty.every((k) => isBlank(data[k.key]))) add(RULES.paidArtist, 'paidNoThirdParty');
  }

  const { layout, metrics } = options;
  if (layout && metrics) {
    // Text fit, measured as the renderer draws it. A template field's warning goes on its first data key.
    const measure = wordCachedMeasure(metrics.measure);
    for (const [name, field] of Object.entries(layout.fields)) {
      if (field.type === 'check') continue;
      const text = fieldText(name, field, data);
      if (text === undefined) continue;
      const key = dataKeysOf(name, field)[0];
      if (field.type === 'text') {
        if (measure(text, field.size) > field.w) add(key, 'tooWide');
      } else {
        const fit = fitLines(text, { w: field.w, size: field.size, maxLines: field.maxLines }, measure);
        if (fit.overflow) add(key, 'tooLong', { lines: fit.neededLines, maxLines: field.maxLines });
      }
    }
  }
  if (metrics) {
    for (const [key, value] of Object.entries(data)) {
      if (!valid.has(key)) continue;
      const missing = [...new Set(strings(value).flatMap((s) => metrics.canDraw(s.normalize('NFC'))))];
      if (missing.length > 0) add(key, 'unsupportedChars', { chars: missing.join(' ') });
    }
  }

  return warnings;
}

/**
 * Measuring with an embedded font is slow (~1 ms a call), and word wrapping
 * measures every candidate line at every shrink step. Widths are plain glyph
 * advances (no kerning, ligatures never cross a space) and scale linearly with
 * size, so a line's width is the sum of its words' and spaces' widths: cache
 * each word once at 1 pt.
 */
function wordCachedMeasure(measure: (text: string, size: number) => number): (text: string, size: number) => number {
  const cache = new Map<string, number>();
  const unit = (part: string) => {
    let w = cache.get(part);
    if (w === undefined) cache.set(part, (w = measure(part, 1)));
    return w;
  };
  return (text, size) => {
    const words = text.split(' ');
    return (words.reduce((sum, word) => sum + unit(word), 0) + (words.length - 1) * unit(' ')) * size;
  };
}

/** CIUP rules (SPEC "Validation", contradictions). Skipped for forms without these keys. */
const RULES = {
  /** Needs the programme page (Sacem). */
  concert: 'type_concert',
  /** Events at the Cité must be free. */
  paidEntry: 'entree_payante',
  /** A paid artist needs a convention: section 5 filled in. */
  paidArtist: 'remunere_oui',
  thirdPartySection: 'tiers',
};

const isBlank = (value: unknown) => value === undefined || value === null || value === '' || value === false;

/** `jj/mm/aaaa` → day number (see `dayNumber`), or undefined if not a real date in that format. */
function parseDate(text: string): number | undefined {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!m) return undefined;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return undefined;
  return dayNumber(y, mo, d);
}

/** Days since 1970-01-01 of a calendar date (no time zone involved). */
function dayNumber(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

/** Every string in a value (recursing into the appendix's objects and arrays). */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value === 'number') return [String(value)];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(strings);
  return [];
}

/** The closest candidate, if it is close enough to be a likely typo: at most max(2, a third of the key's length) edits away. */
function closest(key: string, candidates: string[]): string | undefined {
  let best: string | undefined;
  let bestDistance = Math.max(2, Math.floor(key.length / 3)) + 1;
  for (const c of candidates) {
    const d = editDistance(key, c);
    if (d < bestDistance) [best, bestDistance] = [c, d];
  }
  return best;
}

/** Levenshtein distance. */
function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}
