/**
 * The form's dates are written jj/mm/aaaa (French order); days and months may
 * have one digit ("1/3/2026"). One parser for validation, file names and the
 * web form's date picker.
 */

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

/** `jj/mm/aaaa` → its calendar date, or undefined if not in that format or not a real date. */
export function parseDate(text: string): CalendarDate | undefined {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!m) return undefined;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return { year, month, day };
}

/** jj/mm/aaaa → yyyy-mm-dd (e.g. for `<input type="date">`), or '' if not a date. */
export function toIsoDate(text: string): string {
  const date = parseDate(text);
  if (!date) return '';
  const two = (n: number) => String(n).padStart(2, '0');
  return `${date.year}-${two(date.month)}-${two(date.day)}`;
}

/** yyyy-mm-dd → jj/mm/aaaa, or '' if not a date. */
export function fromIsoDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}
