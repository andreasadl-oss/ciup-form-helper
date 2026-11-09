/**
 * The renderer: overlay data onto a flat PDF form, as `reference/fill.py` does.
 * Pure (no DOM): bytes + layout + data in, bytes + problems out.
 */
import { PDFDocument, rgb, type PDFPage } from 'pdf-lib';
import { drawAppendix, type Appendix } from './appendix';
import { fitLines } from './fit';
import { helvetica, type EmbeddedFonts, type Face, type FontFamily } from './font';
import { dataKeysOf, type Layout, type LayoutField } from './layout';

/** Ink colour #1a2a6c: dark blue, reads as "filled in by hand". */
export const INK = rgb(0x1a / 255, 0x2a / 255, 0x6c / 255);
const WHITE = rgb(1, 1, 1);
const CHECK_SIZE = 10;

/** Flat key/values using layout field names and template keys, plus `appendix`. */
export type FillData = Record<string, unknown> & { appendix?: Appendix | null };

export interface Problem {
  /** Layout field name. */
  field: string;
  message: string;
}

export interface RenderInput {
  /** The blank form PDF (left untouched; a copy is drawn on). */
  formPdf: Uint8Array;
  layout: Layout;
  data: FillData;
  /** Defaults to Helvetica. */
  fonts?: FontFamily;
}

export interface RenderResult {
  pdf: Uint8Array;
  problems: Problem[];
}

export async function renderForm({ formPdf, layout, data, fonts = helvetica }: RenderInput): Promise<RenderResult> {
  const doc = await PDFDocument.load(formPdf);
  const faces = await fonts.embed(doc);
  const problems: Problem[] = [];
  const pages = doc.getPages();

  for (const [name, field] of Object.entries(layout.fields)) {
    const page = pages[field.page];
    if (!page) {
      problems.push({ field: name, message: `page ${field.page} does not exist in the form` });
      continue;
    }
    drawField(page, name, field, data, faces, problems);
  }

  if (data.appendix) drawAppendix(doc, data.appendix, faces);

  return { pdf: await doc.save(), problems };
}

function drawField(
  page: PDFPage,
  name: string,
  field: LayoutField,
  data: FillData,
  faces: EmbeddedFonts,
  problems: Problem[],
): void {
  if (field.type === 'check') {
    if (data[name] === true) {
      page.drawText('X', { x: field.x + 1.4, y: field.y + 0.6, size: CHECK_SIZE, font: faces.bold.pdfFont, color: INK });
    }
    return;
  }

  const keys = dataKeysOf(name, field);
  if (!keys.some((key) => !isEmpty(data[key]))) return;
  const template = field.template ?? `{${name}}`;
  const text = template.replace(/\{(\w+)\}/g, (_, key: string) => (isEmpty(data[key]) ? '' : String(data[key]))).trim();
  const font = faces.regular;

  let lines: string[];
  let size = field.size;
  let leading = 0;
  if (field.type === 'text') {
    lines = [text];
    if (font.widthOfTextAtSize(text, size) > field.w) problems.push({ field: name, message: 'text wider than the field' });
  } else {
    const fit = fitLines(text, { w: field.w, size: field.size, maxLines: field.maxLines }, (s, sz) =>
      font.widthOfTextAtSize(s, sz),
    );
    lines = fit.lines;
    size = fit.size;
    leading = field.leading;
    if (fit.overflow) {
      problems.push({ field: name, message: `text too long (${fit.neededLines} lines, max ${field.maxLines})` });
    }
  }

  lines.forEach((line, i) => drawLine(page, line, field.x, field.y - i * leading, field.w, size, font));
}

/** White out the dotted leader, then draw the text on its baseline. */
function drawLine(page: PDFPage, text: string, x: number, y: number, w: number, size: number, font: Face): void {
  page.drawRectangle({ x: x - 1, y: y - 3, width: w + 2, height: 11.5, color: WHITE });
  page.drawText(text, { x, y, size, font: font.pdfFont, color: INK });
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}
