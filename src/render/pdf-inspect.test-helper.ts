/**
 * Test helper: read back what pdf-lib drew into a PDF, from its content streams.
 * Only understands the operator shapes pdf-lib emits (`/Font size Tf ... x y Tm <hex> Tj`).
 */
import { create as createFont, type Font } from '@pdf-lib/fontkit';
import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  type PDFPage,
} from 'pdf-lib';

export interface TextRun {
  text: string;
  x: number;
  y: number;
  size: number;
  bold: boolean;
  /** Fill colour "r g b" as written in the stream, e.g. "0.10196 0.16471 0.42353". */
  color: string;
}

export async function textRuns(pdf: Uint8Array, pageIndex: number): Promise<TextRun[]> {
  const doc = await PDFDocument.load(pdf);
  const content = pageContent(doc.getPage(pageIndex));
  const runs: TextRun[] = [];
  const re =
    /BT\s+([\d.]+) ([\d.]+) ([\d.]+) rg\s+\/(\S+) ([\d.]+) Tf\s+(?:[\d.]+ TL\s+)?[-\d.]+ [-\d.]+ [-\d.]+ [-\d.]+ ([-\d.]+) ([-\d.]+) Tm\s+<([0-9A-Fa-f]*)> Tj/g;
  for (const m of content.matchAll(re)) {
    runs.push({
      color: [m[1], m[2], m[3]].map((v) => Number(v).toFixed(5)).join(' '),
      bold: /Bold/.test(m[4]),
      size: Number(m[5]),
      x: Number(m[6]),
      y: Number(m[7]),
      text: decodeHex(m[8]),
    });
  }
  return runs;
}

/** White rectangles drawn by pdf-lib's drawRectangle: [x, y, w, h]. */
export async function whiteRects(pdf: Uint8Array, pageIndex: number): Promise<number[][]> {
  const doc = await PDFDocument.load(pdf);
  const content = pageContent(doc.getPage(pageIndex));
  const re = /1 1 1 rg\s+(?:[^\n]*\n)*?1 0 0 1 ([-\d.]+) ([-\d.]+) cm\s+(?:1 0 0 1 0 0 cm\s+)*0 0 m\s+0 ([-\d.]+) l\s+([-\d.]+) [-\d.]+ l/g;
  return [...content.matchAll(re)].map((m) => [Number(m[1]), Number(m[2]), Number(m[4]), Number(m[3])]);
}

/**
 * For each `Tj` drawn with an embedded (Type0, Identity-H) font: the width a
 * PDF viewer advances by, computed from the glyph ids in the stream and the
 * font's own `/W` widths array. Independent of how the renderer measured.
 */
export async function drawnType0Widths(pdf: Uint8Array, pageIndex: number): Promise<{ glyphs: number; width: number }[]> {
  const doc = await PDFDocument.load(pdf);
  const page = doc.getPage(pageIndex);
  const content = pageContent(page);
  const fonts = page.node.Resources()!.lookup(PDFName.of('Font'), PDFDict);
  const result: { glyphs: number; width: number }[] = [];
  for (const m of content.matchAll(/\/(\S+) ([\d.]+) Tf(?:(?!\sTf\s)[\s\S])*?<([0-9A-Fa-f]*)> Tj/g)) {
    const descendants = fonts.lookupMaybe(PDFName.of(m[1]), PDFDict)?.lookupMaybe(PDFName.of('DescendantFonts'), PDFArray);
    if (!descendants) continue; // not a Type0 font (e.g. the blank form's own text)
    const cid = descendants.lookup(0, PDFDict);
    const widths = cidWidths(cid.lookup(PDFName.of('W'), PDFArray));
    const ids = (m[3].match(/.{4}/g) ?? []).map((h) => parseInt(h, 16));
    const units = ids.reduce((sum, id) => sum + (widths.get(id) ?? 0), 0);
    result.push({ glyphs: ids.length, width: (units * Number(m[2])) / 1000 });
  }
  return result;
}

/** One glyph drawn with an embedded TrueType font, as a PDF viewer would rasterise it. */
export interface DrawnGlyph {
  /** The character the glyph stands for (from the font's /ToUnicode map). */
  char: string;
  /** The glyph's outline in the embedded font program as SVG path data ('' = draws nothing, null = unreadable glyph record). */
  outline: string | null;
  /** Byte length of the glyph's record according to the embedded font's loca table (what FreeType/pdfium read). */
  recordLength: number;
  /** Whether the font is a bold face (its /BaseFont name contains 'Bold'). */
  bold: boolean;
}

/**
 * For each `Tj` drawn with an embedded (Type0, Identity-H) font: its glyphs,
 * decoded from the font program actually embedded in the PDF (the subset),
 * not from the source font. Catches a broken subset that text extraction misses.
 */
export async function drawnGlyphs(pdf: Uint8Array, pageIndex: number): Promise<DrawnGlyph[][]> {
  const doc = await PDFDocument.load(pdf);
  const page = doc.getPage(pageIndex);
  const content = pageContent(page);
  const fonts = page.node.Resources()!.lookup(PDFName.of('Font'), PDFDict);
  const runs: DrawnGlyph[][] = [];
  for (const m of content.matchAll(/\/(\S+) [\d.]+ Tf(?:(?!\sTf\s)[\s\S])*?<([0-9A-Fa-f]*)> Tj/g)) {
    const type0 = fonts.lookupMaybe(PDFName.of(m[1]), PDFDict);
    const descendants = type0?.lookupMaybe(PDFName.of('DescendantFonts'), PDFArray);
    if (!type0 || !descendants) continue;
    const descriptor = descendants.lookup(0, PDFDict).lookup(PDFName.of('FontDescriptor'), PDFDict);
    const program = createFont(streamBytes(descriptor.lookup(PDFName.of('FontFile2'))));
    const unicode = toUnicode(latin1(streamBytes(type0.lookup(PDFName.of('ToUnicode')))));
    const bold = /Bold/.test(type0.lookup(PDFName.of('BaseFont'), PDFName).asString());
    const ids = (m[2].match(/.{4}/g) ?? []).map((h) => parseInt(h, 16));
    runs.push(ids.map((id) => ({ char: unicode.get(id) ?? '', outline: outline(program, id), recordLength: glyphRecordLength(program, id), bold })));
  }
  return runs;
}

function streamBytes(stream: unknown): Uint8Array {
  if (!(stream instanceof PDFRawStream)) throw new Error('expected a stream');
  return decodePDFRawStream(stream).decode();
}

function outline(font: Font, id: number): string | null {
  try {
    return font.getGlyph(id).path.toSVG();
  } catch {
    return null;
  }
}

/** Byte length of glyph `id`'s glyf record, from the font's loca offsets. */
export function glyphRecordLength(font: Font, id: number): number {
  const { offsets } = (font as unknown as { loca: { offsets: number[] } }).loca;
  return offsets[id + 1] - offsets[id];
}

/** Parse the `<gid> <utf16be>` lines of a ToUnicode CMap's bfchar section. */
function toUnicode(cmap: string): Map<number, string> {
  const map = new Map<number, string>();
  for (const m of cmap.matchAll(/^<([0-9A-Fa-f]+)> <([0-9A-Fa-f]+)>$/gm)) {
    const units = (m[2].match(/.{4}/g) ?? []).map((h) => parseInt(h, 16));
    map.set(parseInt(m[1], 16), String.fromCharCode(...units));
  }
  return map;
}

/** Parse a CID font `/W` array: `c [w1 w2 ...]` and `c1 c2 w` entries. */
function cidWidths(w: PDFArray): Map<number, number> {
  const map = new Map<number, number>();
  const items = w.asArray().map((_, i) => w.lookup(i));
  for (let i = 0; i < items.length; ) {
    const first = (items[i] as PDFNumber).asNumber();
    const next = items[i + 1];
    if (next instanceof PDFArray) {
      next.asArray().forEach((v, j) => map.set(first + j, (v as PDFNumber).asNumber()));
      i += 2;
    } else {
      const last = (next as PDFNumber).asNumber();
      const width = (items[i + 2] as PDFNumber).asNumber();
      for (let c = first; c <= last; c++) map.set(c, width);
      i += 3;
    }
  }
  return map;
}

function pageContent(page: PDFPage): string {
  const contents = page.node.Contents();
  const streams = contents instanceof PDFArray ? contents.asArray().map((ref) => page.doc.context.lookup(ref)) : [contents];
  return streams
    .map((stream) => (stream instanceof PDFRawStream ? latin1(decodePDFRawStream(stream).decode()) : ''))
    .join('\n');
}

function latin1(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return s;
}

/** WinAnsi hex string -> text (Latin-1 range is enough for tests). */
function decodeHex(hex: string): string {
  let s = '';
  for (let i = 0; i < hex.length; i += 2) s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  return s;
}
