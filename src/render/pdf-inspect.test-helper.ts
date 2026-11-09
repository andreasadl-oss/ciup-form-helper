/**
 * Test helper: read back what pdf-lib drew into a PDF, from its content streams.
 * Only understands the operator shapes pdf-lib emits (`/Font size Tf ... x y Tm <hex> Tj`).
 */
import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream, type PDFPage } from 'pdf-lib';

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
