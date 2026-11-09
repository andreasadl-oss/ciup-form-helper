/**
 * Glue between the form registry and the pure renderer: parse a form's layout
 * once, load its blank PDF once, render data onto it on demand.
 */
import { loadFormPdf, type FormFiles } from '../forms/registry';
import type { FontFamily } from './font';
import { parseLayout } from './layout';
import { notoSans } from './noto-sans';
import { renderForm, type FillData, type RenderResult } from './render';

export interface FormFiller {
  (data: FillData): Promise<RenderResult>;
  /** The blank form PDF, loaded on first use and shared with rendering (call it to preload). */
  blankPdf(): Promise<Uint8Array>;
}

export function createFormFiller(
  form: FormFiles,
  loadPdf: (form: FormFiles) => Promise<Uint8Array> = loadFormPdf,
  fonts: FontFamily = notoSans,
): FormFiller {
  const layout = parseLayout(form.layoutYaml);
  let blank: Promise<Uint8Array> | undefined;
  const blankPdf = () => (blank ??= loadPdf(form));
  const fill = async (data: FillData) => renderForm({ formPdf: await blankPdf(), layout, data, fonts });
  return Object.assign(fill, { blankPdf });
}
