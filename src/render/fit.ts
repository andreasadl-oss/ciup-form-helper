/**
 * Text fitting, independent of pdf-lib and of any concrete font: callers pass a
 * width function. Validation (ticket 08) reuses these to predict "doesn't fit"
 * with exactly the logic the renderer uses.
 */

/** Width in points of `text` at `size` pt. See `createFontMetrics` in ./font. */
export type WidthAtSize = (text: string, size: number) => number;

/** Smallest size `lines` fields shrink to (pt). */
export const MIN_LINES_SIZE = 7;
/** Shrink step for `lines` fields (pt). */
export const SHRINK_STEP = 0.5;

/**
 * Greedy word wrap like reportlab's `simpleSplit`: explicit newlines always
 * break, words are joined by single spaces while the line fits in `width`.
 * A word wider than `width` gets a line of its own (it is never cut).
 */
export function wrapText(text: string, width: number, widthOf: (text: string) => number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (!line || widthOf(candidate) <= width) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export interface LinesBox {
  w: number;
  /** Start size (pt). */
  size: number;
  maxLines: number;
}

export interface LinesFit {
  /** Lines to draw (at most `maxLines`). */
  lines: string[];
  /** Font size the lines are drawn at. */
  size: number;
  /** True when the text needs more than `maxLines` lines even at 7 pt. */
  overflow: boolean;
  /** How many lines the text needs at `size`. */
  neededLines: number;
}

/** Wrap into `box`, shrinking by 0.5 pt steps down to 7 pt until it fits in `maxLines`. */
export function fitLines(text: string, box: LinesBox, widthAt: WidthAtSize): LinesFit {
  let size = box.size;
  let lines = wrapText(text, box.w, (s) => widthAt(s, size));
  while (lines.length > box.maxLines && size > MIN_LINES_SIZE) {
    size -= SHRINK_STEP;
    lines = wrapText(text, box.w, (s) => widthAt(s, size));
  }
  const overflow = lines.length > box.maxLines;
  return { lines: overflow ? lines.slice(0, box.maxLines) : lines, size, overflow, neededLines: lines.length };
}
