// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { createFontMetrics, createMeasure, helvetica } from './font';
import { notoSansFromDisk } from './noto-sans.test-helper';
import { drawnType0Widths } from './pdf-inspect.test-helper';

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

describe('Noto Sans', () => {
  it('measures text exactly as wide as it is drawn (no kerning mismatch)', async () => {
    const text = 'AV To Wa Soirée « fi » Ωμέγα Привет Tiếng Việt';
    const measure = await createMeasure(notoSansFromDisk);
    const doc = await PDFDocument.create();
    const fonts = await notoSansFromDisk.embed(doc);
    doc.addPage().drawText(text, { x: 10, y: 10, size: 10, font: fonts.regular.pdfFont });
    const [drawn] = await drawnType0Widths(await doc.save(), 0);
    expect(drawn.glyphs).toBeGreaterThan(0);
    expect(measure(text, 10)).toBeCloseTo(drawn.width, 3);
  });
});

describe('createFontMetrics: glyph coverage', () => {
  it('Noto Sans covers French, Greek, Cyrillic and Vietnamese', async () => {
    const { canDraw } = await createFontMetrics(notoSansFromDisk);
    expect(canDraw('Soirée à l’œuvre « ça » — Ωμέγα Привет Tiếng Việt')).toEqual([]);
  });

  it('lists each character Noto Sans cannot draw once, in order', async () => {
    const { canDraw } = await createFontMetrics(notoSansFromDisk);
    expect(canDraw('Fête 🎉 中文 🎉')).toEqual(['🎉', '中', '文']);
  });

  it('Helvetica cannot draw outside WinAnsi', async () => {
    const { canDraw } = await createFontMetrics(helvetica);
    expect(canDraw('Soirée Ω')).toEqual(['Ω']);
  });

  it('ignores line breaks and tabs', async () => {
    const { canDraw } = await createFontMetrics(notoSansFromDisk);
    expect(canDraw('a\nb\tc\r\n')).toEqual([]);
  });

  it('measures like createMeasure', async () => {
    const { measure } = await createFontMetrics(helvetica);
    expect(measure('Hello', 10)).toBeCloseTo(22.78, 5);
  });
});
