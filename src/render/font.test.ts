// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createMeasure, helvetica } from './font';

describe('createMeasure (Helvetica)', () => {
  it('measures regular text with the Helvetica AFM widths', async () => {
    const measure = await createMeasure(helvetica);
    // H 722 + e 556 + l 222 + l 222 + o 556 = 2278 / 1000 em
    expect(measure('Hello', 10)).toBeCloseTo(22.78, 5);
  });

  it('measures bold text with Helvetica-Bold widths', async () => {
    const measure = await createMeasure(helvetica);
    // Helvetica-Bold: X 667, i 278
    expect(measure('Xi', 10, { bold: true })).toBeCloseTo(9.45, 5);
  });

  it('measures the width as drawn, without kerning (like reportlab)', async () => {
    const measure = await createMeasure(helvetica);
    // A 667 + V 667; the AFM's A-V kerning pair is not applied when drawing with Tj.
    expect(measure('AV', 10)).toBeCloseTo(13.34, 5);
  });

  it('measures accented Latin-1 characters', async () => {
    const measure = await createMeasure(helvetica);
    // eacute 556
    expect(measure('é', 10)).toBeCloseTo(5.56, 5);
  });

  it('defaults to Helvetica', async () => {
    const measure = await createMeasure();
    expect(measure('Hello', 20)).toBeCloseTo(45.56, 5);
  });
});
