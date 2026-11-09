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
  /** The characters of `text` this face has no glyph for, each once, in order. */
  canDraw(text: string): string[];
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

export interface FontBytes {
  regular: Uint8Array;
  bold: Uint8Array;
}

/**
 * Noto Sans (Latin, Greek, Cyrillic, Vietnamese...) embedded as TrueType
 * subsets via fontkit. `load` is called at most once, on first embed, so the
 * font files never block first paint. See `noto-sans.ts` for the app's loader.
 */
export function notoSansFrom(load: () => Promise<FontBytes>): FontFamily {
  let bytes: Promise<FontBytes> | undefined;
  return {
    name: 'Noto Sans',
    async embed(doc) {
      bytes ??= load().catch((error: unknown) => {
        bytes = undefined; // allow a retry after a failed download
        throw error;
      });
      // fontkit is big: load it with the font files, not with the app.
      const [{ regular, bold }, { default: fontkit }] = await Promise.all([bytes, import('@pdf-lib/fontkit')]);
      doc.registerFontkit(withEvenGlyphRecords(fontkit));
      const [r, b] = await Promise.all([
        doc.embedFont(regular, { subset: true }),
        doc.embedFont(bold, { subset: true }),
      ]);
      return { regular: customFace(r), bold: customFace(b) };
    },
  };
}

/** What pdf-lib needs from fontkit (`doc.registerFontkit`). */
type Fontkit = Parameters<PDFDocument['registerFontkit']>[0];

/** The private parts of @pdf-lib/fontkit's `TTFSubset` that `withEvenGlyphRecords` patches. */
interface TTFSubsetInternals {
  _addGlyph(gid: number): number;
  glyf: Uint8Array[];
  offset: number;
}

/**
 * Ticket 12. @pdf-lib/fontkit's TrueType subsetter copies each glyph record
 * as is, then writes a short-format `loca` (offsets / 2) whenever the subset's
 * `glyf` is under 64 KB, which it always is here. Noto Sans has odd-length
 * glyph records, so every offset after one is rounded down a byte: viewers
 * (pdfium, pdf.js, FreeType) then drop those glyphs ("Maison" drew as "n").
 * Pad each record to an even length, as the TrueType spec requires for a
 * short `loca`. Wraps fontkit instead of patching it globally.
 */
export function withEvenGlyphRecords(fontkit: Fontkit): Fontkit {
  return {
    create(buffer, postscriptName) {
      const font = fontkit.create(buffer, postscriptName);
      const createSubset = font.createSubset.bind(font);
      font.createSubset = () => {
        const subset = createSubset();
        const internals = subset as unknown as Partial<TTFSubsetInternals>;
        const addGlyph = internals._addGlyph;
        if (typeof addGlyph !== 'function') return subset; // CFF subset: no loca
        internals._addGlyph = function (this: TTFSubsetInternals, gid: number) {
          const index = addGlyph.call(this, gid);
          const record = this.glyf[index];
          if (record.length % 2 === 1) {
            // Same (Buffer polyfill) class fontkit uses, zero-filled.
            const padded = new (record.constructor as Uint8ArrayConstructor)(record.length + 1);
            padded.set(record);
            padded[record.length] = 0;
            this.glyf[index] = padded;
            this.offset += 1;
          }
          return index;
        };
        return subset;
      };
      return font;
    },
  };
}

/**
 * For fontkit fonts pdf-lib measures and draws the same glyphs (after GSUB
 * substitutions such as ligatures) with their plain advance widths, so its
 * `widthOfTextAtSize` already matches the drawn width; no GPOS kerning either way.
 */
function customFace(pdfFont: PDFFont): Face {
  return { pdfFont, widthOfTextAtSize: (text, size) => pdfFont.widthOfTextAtSize(text, size), canDraw: coverage(pdfFont) };
}

/**
 * pdf-lib's own `widthOfTextAtSize` applies AFM kerning pairs, but `drawText`
 * does not kern, so it under-measures. Sum plain glyph widths instead (this is
 * also what reportlab's `stringWidth` does).
 */
function standardFace(pdfFont: PDFFont, name: FontNames): Face {
  const metrics = Font.load(name);
  return {
    pdfFont,
    canDraw: coverage(pdfFont),
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

/** Line breaks and tabs are layout, not glyphs: never reported as missing. */
const LAYOUT_CHARS = new Set(['\n', '\r', '\t']);

function coverage(pdfFont: PDFFont): (text: string) => string[] {
  let supported: Set<number> | undefined;
  return (text) => {
    supported ??= new Set(pdfFont.getCharacterSet());
    const missing = new Set<string>();
    for (const char of text) {
      if (!LAYOUT_CHARS.has(char) && !supported.has(char.codePointAt(0)!)) missing.add(char);
    }
    return [...missing];
  };
}

/** Width in points of `text` at `size` pt in the family's regular (or bold) face. */
export type MeasureText = (text: string, size: number, options?: { bold?: boolean }) => number;

/**
 * A text-width function for a font family, usable without rendering
 * (e.g. for "doesn't fit" validation). Gives the same widths the renderer uses.
 */
export async function createMeasure(family: FontFamily = helvetica): Promise<MeasureText> {
  return (await createFontMetrics(family)).measure;
}

export interface FontMetrics {
  measure: MeasureText;
  /** Characters of `text` that can't be drawn in the regular or bold face, each once, in order. Empty when all can. */
  canDraw(text: string): string[];
}

/** Measuring and glyph coverage for a font family, without rendering (for validation). */
export async function createFontMetrics(family: FontFamily = helvetica): Promise<FontMetrics> {
  const fonts = await family.embed(await PDFDocument.create());
  return {
    measure: (text, size, options) => (options?.bold ? fonts.bold : fonts.regular).widthOfTextAtSize(text, size),
    canDraw: (text) => [...new Set([...fonts.regular.canDraw(text), ...fonts.bold.canDraw(text)])],
  };
}
