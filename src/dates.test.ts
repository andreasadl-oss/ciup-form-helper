import { describe, expect, it } from 'vitest';
import { fromIsoDate, parseDate, toIsoDate } from './dates';

describe('parseDate (jj/mm/aaaa)', () => {
  it('reads two-digit and one-digit days and months', () => {
    expect(parseDate('12/12/2026')).toEqual({ year: 2026, month: 12, day: 12 });
    expect(parseDate(' 1/3/2026 ')).toEqual({ year: 2026, month: 3, day: 1 });
  });

  it('rejects other formats and dates that do not exist', () => {
    expect(parseDate('2026-12-12')).toBeUndefined();
    expect(parseDate('31/02/2027')).toBeUndefined();
    expect(parseDate('12/12/26')).toBeUndefined();
  });
});

describe('toIsoDate / fromIsoDate (for <input type="date">)', () => {
  it('converts jj/mm/aaaa, including one-digit parts, to yyyy-mm-dd', () => {
    expect(toIsoDate('12/12/2026')).toBe('2026-12-12');
    expect(toIsoDate('1/3/2026')).toBe('2026-03-01');
    expect(toIsoDate('TODO date')).toBe('');
  });

  it('converts yyyy-mm-dd back to jj/mm/aaaa', () => {
    expect(fromIsoDate('2026-03-01')).toBe('01/03/2026');
    expect(fromIsoDate('')).toBe('');
  });
});
