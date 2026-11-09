/**
 * Font abstraction. The renderer only sees a `FontFamily`: something that can
 * embed a regular and a bold `Face` into a PDF document. Ticket 10 adds an
 * embedded Noto Sans family next to `helvetica` without touching the renderer.
 */
import { Encodings, Font, FontNames } from '@pdf-lib/standard-fonts';
import { PDFDocument, StandardFonts, type PDFFont } from 'pdf-lib';

/** One embedded face: what to draw with and how wide the drawn text is. */
export interface Face {
  /** Passed to pdf-lib's `drawText`. */
  pdfFont: PDFFont;
  /** Width in points of `text` as drawn at `size` pt. */
  widthOfTextAtSize(text: string, size: number): number;
}

export interface EmbeddedFonts {
  regular: Face;
  bold: Face;
}

export interface FontFamily {
  name: string;
  /** Embed both faces into `doc` (called once per rendered document). */
  embed(doc: PDFDocument): Promise<EmbeddedFonts>;
}

export const helvetica: FontFamily = {
  name: 'Helvetica',
  async embed(doc) {
    const [regular, bold] = await Promise.all([
      doc.embedFont(StandardFonts.Helvetica),
      doc.embedFont(StandardFonts.HelveticaBold),
    ]);
    return { regular: standardFace(regular, FontNames.Helvetica), bold: standardFace(bold, FontNames.HelveticaBold) };
  },
};

/**
 * pdf-lib's own `widthOfTextAtSize` applies AFM kerning pairs, but `drawText`
 * does not kern, so it under-measures. Sum plain glyph widths instead (this is
 * also what reportlab's `stringWidth` does).
 */
function standardFace(pdfFont: PDFFont, name: FontNames): Face {
  const metrics = Font.load(name);
  return {
    pdfFont,
    widthOfTextAtSize(text, size) {
      let units = 0;
      for (const char of text) {
        const glyph = Encodings.WinAnsi.encodeUnicodeCodePoint(char.codePointAt(0)!).name;
        units += metrics.getWidthOfGlyph(glyph) ?? 0;
      }
      return (units * size) / 1000;
    },
  };
}

/** Width in points of `text` at `size` pt in the family's regular (or bold) face. */
export type MeasureText = (text: string, size: number, options?: { bold?: boolean }) => number;

/**
 * A text-width function for a font family, usable without rendering
 * (e.g. for "doesn't fit" validation). Gives the same widths the renderer uses.
 */
export async function createMeasure(family: FontFamily = helvetica): Promise<MeasureText> {
  const fonts = await family.embed(await PDFDocument.create());
  return (text, size, options) => (options?.bold ? fonts.bold : fonts.regular).widthOfTextAtSize(text, size);
}
