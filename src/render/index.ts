// Public API of the renderer. Pure: no DOM, usable in tests and workers.
export { renderForm, fieldText, INK, type FillData, type Problem, type RenderInput, type RenderResult } from './render';
export { type Appendix } from './appendix';
export {
  parseLayout,
  dataKeysOf,
  templateKeys,
  type Layout,
  type LayoutField,
  type TextField,
  type CheckField,
  type LinesField,
} from './layout';
export {
  helvetica,
  notoSansFrom,
  createMeasure,
  createFontMetrics,
  type Face,
  type EmbeddedFonts,
  type FontBytes,
  type FontFamily,
  type FontMetrics,
  type MeasureText,
} from './font';
// The app's Noto Sans (fetches the bundled TTFs on first use): import { notoSans } from './noto-sans'.
export { wrapText, fitLines, MIN_LINES_SIZE, SHRINK_STEP, type LinesBox, type LinesFit, type WidthAtSize } from './fit';
