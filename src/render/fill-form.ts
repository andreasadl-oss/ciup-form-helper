/**
 * Glue between the form registry and the pure renderer: parse a form's layout
 * once, load its blank PDF once, render data onto it on demand.
 */
import { parse } from 'yaml';
import exampleYaml from '../../reference/example-data.yaml?raw';
import { loadFormPdf, type FormFiles } from '../forms/registry';
import type { FontFamily } from './font';
import { parseLayout } from './layout';
import { notoSans } from './noto-sans';
import { renderForm, type FillData, type RenderResult } from './render';

/** `reference/example-data.yaml`, the fictional filled-in request. */
export const EXAMPLE_DATA = parse(exampleYaml) as FillData;

export type FormFiller = (data: FillData) => Promise<RenderResult>;

export function createFormFiller(
  form: FormFiles,
  loadPdf: (form: FormFiles) => Promise<Uint8Array> = loadFormPdf,
  fonts: FontFamily = notoSans,
): FormFiller {
  const layout = parseLayout(form.layoutYaml);
  let blank: Promise<Uint8Array> | undefined;
  return async (data) => {
    blank ??= loadPdf(form);
    return renderForm({ formPdf: await blank, layout, data, fonts });
  };
}
