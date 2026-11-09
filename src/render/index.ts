// Public API of the renderer. Pure: no DOM, usable in tests and workers.
export { renderForm, INK, type FillData, type Problem, type RenderInput, type RenderResult } from './render';
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
export { helvetica, createMeasure, type Face, type EmbeddedFonts, type FontFamily, type MeasureText } from './font';
export { wrapText, fitLines, MIN_LINES_SIZE, SHRINK_STEP, type LinesBox, type LinesFit, type WidthAtSize } from './fit';
