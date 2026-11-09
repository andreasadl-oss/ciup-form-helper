import { describe, expect, it } from 'vitest';
import { fitLines, wrapText } from './fit';

/** Fake metrics: every character is `size` points wide (independent of any font). */
const monospace = (text: string, size: number) => text.length * size;

describe('wrapText', () => {
  it('keeps text that fits on one line', () => {
    expect(wrapText('hello world', 110, (s) => monospace(s, 10))).toEqual(['hello world']);
  });

  it('breaks greedily between words', () => {
    // width 100 at 10 pt/char = 10 chars per line
    expect(wrapText('aaa bbb ccc ddd eee', 100, (s) => monospace(s, 10))).toEqual(['aaa bbb', 'ccc ddd', 'eee']);
  });

  it('collapses runs of spaces and keeps explicit newlines as breaks', () => {
    expect(wrapText('a   b\nc', 100, (s) => monospace(s, 10))).toEqual(['a b', 'c']);
  });

  it('puts a word longer than the width on its own line instead of losing it', () => {
    expect(wrapText('hi abcdefghijklmn yo', 100, (s) => monospace(s, 10))).toEqual(['hi', 'abcdefghijklmn', 'yo']);
  });

  it('returns no lines for empty text', () => {
    expect(wrapText('   ', 100, (s) => monospace(s, 10))).toEqual([]);
  });
});

describe('fitLines', () => {
  it('keeps the start size when the text fits in max lines', () => {
    expect(fitLines('aaa bbb', { w: 100, size: 10, maxLines: 1 }, monospace)).toEqual({
      lines: ['aaa bbb'],
      size: 10,
      overflow: false,
      neededLines: 1,
    });
  });

  it('shrinks by 0.5 pt steps until the text fits', () => {
    // 12 chars: at 10 pt needs 2 lines of width 100; at 8 pt a line holds 12.5 chars.
    const fit = fitLines('aaaaa bbbbbb', { w: 100, size: 10, maxLines: 1 }, monospace);
    expect(fit).toEqual({ lines: ['aaaaa bbbbbb'], size: 8, overflow: false, neededLines: 1 });
  });

  it('stops at 7 pt and truncates to max lines, reporting overflow', () => {
    const text = Array.from({ length: 20 }, () => 'word').join(' ');
    const fit = fitLines(text, { w: 50, size: 10, maxLines: 2 }, monospace);
    expect(fit.size).toBe(7);
    expect(fit.lines).toHaveLength(2);
    expect(fit.overflow).toBe(true);
    expect(fit.neededLines).toBeGreaterThan(2);
  });
});
