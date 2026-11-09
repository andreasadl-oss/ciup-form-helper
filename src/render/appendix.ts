/**
 * Appendix page (e.g. the Sacem programme), a clean equivalent of the
 * reportlab story in `reference/fill.py`: Title, intro, table, outro on A4
 * with 50 pt side margins. Metrics follow reportlab's defaults (frame padding
 * 6, top/bottom margin 72, Title 18/22 bold centred, Normal 10/12, cell padding
 * 6/3/6/5) so the output lines up with `reference/example-output.pdf` page 3.
 */
import { grayscale, LineCapStyle, rgb, type PDFDocument, type PDFPage } from 'pdf-lib';
import { wrapText } from './fit';
import type { EmbeddedFonts, Face } from './font';

export interface Appendix {
  title: string;
  intro?: string;
  columns: string[];
  /** Points per column. Default: the frame width split evenly. */
  col_widths?: number[];
  rows: unknown[][];
  outro?: string;
}

/**
 * Whether an appendix data value has at least one row with a non-blank cell.
 * An empty table (as "Add programme page" creates) counts as no appendix.
 */
export function appendixHasRows(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const rows = (value as { rows?: unknown }).rows;
  if (!Array.isArray(rows)) return false;
  return rows.some((row) => (Array.isArray(row) ? row : [row]).some((cell) => cell != null && String(cell).trim() !== ''));
}

const A4: [number, number] = [595.2756, 841.8898];
const MARGIN_X = 50;
const MARGIN_Y = 72;
const FRAME_PAD = 6;
const FRAME_LEFT = MARGIN_X + FRAME_PAD;
const FRAME_WIDTH = A4[0] - 2 * (MARGIN_X + FRAME_PAD);
const FRAME_TOP = A4[1] - MARGIN_Y - FRAME_PAD;
const FRAME_BOTTOM = MARGIN_Y + FRAME_PAD;
const SPACER = 12;

const TITLE = { size: 18, leading: 22, spaceAfter: 6 };
const NORMAL = { size: 10, leading: 12 };
const CELL = { size: 10, leading: 12, padX: 6, padTop: 3, padBottom: 5 };

const TEXT = rgb(0, 0, 0);
const HEADER_RULE = { thickness: 0.8, color: rgb(0, 0, 0) };
const GRID = { thickness: 0.25, color: grayscale(0.501961) };

/** Append the appendix page(s) to `doc`. */
export function drawAppendix(doc: PDFDocument, appendix: Appendix, fonts: EmbeddedFonts): void {
  const flow = new Flow(doc);

  flow.paragraph(appendix.title, fonts.bold, TITLE, 'center');
  flow.space(TITLE.spaceAfter);
  if (appendix.intro) {
    flow.paragraph(appendix.intro, fonts.regular, NORMAL, 'left');
    flow.space(SPACER);
  }
  drawTable(flow, appendix, fonts);
  if (appendix.outro) {
    flow.space(SPACER);
    flow.paragraph(appendix.outro, fonts.regular, NORMAL, 'left');
  }
}

/** A cursor moving down A4 pages, adding a page when the next block doesn't fit. */
class Flow {
  page: PDFPage;
  y = FRAME_TOP;

  constructor(private readonly doc: PDFDocument) {
    this.page = doc.addPage(A4);
  }

  /** Make room for `height`; returns true when a new page was started. */
  ensure(height: number): boolean {
    if (this.y - height >= FRAME_BOTTOM || this.y === FRAME_TOP) return false;
    this.page = this.doc.addPage(A4);
    this.y = FRAME_TOP;
    return true;
  }

  space(height: number): void {
    // Like reportlab, space at the top of a frame is dropped.
    if (this.y !== FRAME_TOP) this.y = Math.max(FRAME_BOTTOM, this.y - height);
  }

  paragraph(text: string, font: Face, style: { size: number; leading: number }, align: 'left' | 'center'): void {
    const lines = wrapText(text, FRAME_WIDTH, (s) => font.widthOfTextAtSize(s, style.size));
    for (const line of lines) {
      this.ensure(style.leading);
      const width = font.widthOfTextAtSize(line, style.size);
      const x = align === 'center' ? FRAME_LEFT + (FRAME_WIDTH - width) / 2 : FRAME_LEFT;
      this.page.drawText(line, { x, y: this.y - style.size, size: style.size, font: font.pdfFont, color: TEXT });
      this.y -= style.leading;
    }
  }
}

function drawTable(flow: Flow, appendix: Appendix, fonts: EmbeddedFonts): void {
  const widths = columnWidths(appendix);
  const lefts = widths.map((_, i) => FRAME_LEFT + widths.slice(0, i).reduce((a, b) => a + b, 0));
  const tableWidth = widths.reduce((a, b) => a + b, 0);

  const layoutRow = (cells: unknown[], font: Face) => {
    const wrapped = widths.map((w, i) =>
      wrapText(cellText(cells[i]), w - 2 * CELL.padX, (s) => font.widthOfTextAtSize(s, CELL.size)),
    );
    const lineCount = Math.max(1, ...wrapped.map((l) => l.length));
    return { wrapped, font, height: CELL.padTop + lineCount * CELL.leading + CELL.padBottom };
  };
  const header = layoutRow(appendix.columns, fonts.bold);
  const body = appendix.rows.map((row) => layoutRow(row, fonts.regular));

  const drawRow = (row: ReturnType<typeof layoutRow>) => {
    row.wrapped.forEach((lines, col) =>
      lines.forEach((line, i) =>
        flow.page.drawText(line, {
          x: lefts[col] + CELL.padX,
          y: flow.y - CELL.padTop - CELL.size - i * CELL.leading,
          size: CELL.size,
          font: row.font.pdfFont,
          color: TEXT,
        }),
      ),
    );
    flow.y -= row.height;
  };

  /** Grid around the body rows drawn on the current page between `top` and `flow.y`. */
  const drawGrid = (top: number, rowBottoms: number[]) => {
    if (rowBottoms.length === 0) return;
    const bottom = flow.y;
    const line = (x1: number, y1: number, x2: number, y2: number) =>
      flow.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, ...GRID, lineCap: LineCapStyle.Round });
    for (const y of [top, ...rowBottoms]) line(FRAME_LEFT, y, FRAME_LEFT + tableWidth, y);
    for (const x of [...lefts, FRAME_LEFT + tableWidth]) line(x, bottom, x, top);
  };

  // Header row (repeated on each page the table continues on).
  const startPage = () => {
    flow.ensure(header.height + (body[0]?.height ?? 0));
    drawRow(header);
    flow.page.drawLine({
      start: { x: FRAME_LEFT, y: flow.y },
      end: { x: FRAME_LEFT + tableWidth, y: flow.y },
      ...HEADER_RULE,
      lineCap: LineCapStyle.Round,
    });
    return flow.y;
  };

  let gridTop = startPage();
  let rowBottoms: number[] = [];
  for (const row of body) {
    if (flow.y - row.height < FRAME_BOTTOM) {
      drawGrid(gridTop, rowBottoms);
      flow.ensure(Number.POSITIVE_INFINITY);
      gridTop = startPage();
      rowBottoms = [];
    }
    drawRow(row);
    rowBottoms.push(flow.y);
  }
  drawGrid(gridTop, rowBottoms);
}

function columnWidths(appendix: Appendix): number[] {
  const count = appendix.columns.length;
  const given = appendix.col_widths;
  if (given && given.length === count && given.every((w) => typeof w === 'number' && w > 0)) return given;
  return Array.from({ length: count }, () => FRAME_WIDTH / count);
}

function cellText(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}
