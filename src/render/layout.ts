/**
 * `layout.yaml` parsing: where each field is drawn on the form.
 * Coordinates are PDF points from the bottom-left; `y` is the text baseline.
 */
import { parse } from 'yaml';
import { templateKeys } from '../template';
import { isRecord } from '../values';

export { templateKeys };

export interface TextField {
  type: 'text';
  page: number;
  x: number;
  y: number;
  w: number;
  size: number;
  /** e.g. "Du {date_debut} au {date_fin}". Absent means "{<field name>}". */
  template?: string;
}

export interface CheckField {
  type: 'check';
  page: number;
  x: number;
  y: number;
}

export interface LinesField {
  type: 'lines';
  page: number;
  x: number;
  y: number;
  w: number;
  size: number;
  leading: number;
  maxLines: number;
  template?: string;
}

export type LayoutField = TextField | CheckField | LinesField;

export interface Layout {
  /** File name of the blank form, relative to the layout file. */
  pdf: string;
  /** In file order. */
  fields: Record<string, LayoutField>;
}

const DEFAULT_SIZE = 10;

/** Parse and check `layout.yaml` text. Throws an Error naming the bad field. */
export function parseLayout(yamlText: string): Layout {
  const raw = parse(yamlText) as unknown;
  if (!isRecord(raw)) throw new Error('layout.yaml: expected a mapping at the top level');
  if (typeof raw.pdf !== 'string') throw new Error('layout.yaml: missing "pdf" (file name of the blank form)');
  if (!isRecord(raw.fields)) throw new Error('layout.yaml: missing "fields" mapping');

  const fields: Record<string, LayoutField> = {};
  for (const [name, spec] of Object.entries(raw.fields)) {
    fields[name] = parseField(name, spec);
  }
  return { pdf: raw.pdf, fields };
}

/** The data keys a field reads: its template keys, or its own name. */
export function dataKeysOf(name: string, field: LayoutField): string[] {
  if (field.type === 'check' || field.template === undefined) return [name];
  return templateKeys(field.template);
}

function parseField(name: string, spec: unknown): LayoutField {
  if (!isRecord(spec)) throw new Error(`layout.yaml: field "${name}" must be a mapping`);
  const num = (key: string, fallback?: number): number => {
    const value = spec[key] ?? fallback;
    if (typeof value !== 'number') throw new Error(`layout.yaml: field "${name}" needs a number "${key}"`);
    return value;
  };
  const template = spec.template;
  if (template !== undefined && typeof template !== 'string') {
    throw new Error(`layout.yaml: field "${name}" has a non-string "template"`);
  }
  const type = spec.type ?? 'text';
  const page = num('page', 0);
  switch (type) {
    case 'check':
      return { type: 'check', page, x: num('x'), y: num('y') };
    case 'text':
      return withTemplate(
        { type: 'text', page, x: num('x'), y: num('y'), w: num('w'), size: num('size', DEFAULT_SIZE) },
        template,
      );
    case 'lines':
      return withTemplate(
        {
          type: 'lines',
          page,
          x: num('x'),
          y: num('y'),
          w: num('w'),
          size: num('size', DEFAULT_SIZE),
          leading: num('leading'),
          maxLines: num('max_lines'),
        },
        template,
      );
    default:
      throw new Error(`layout.yaml: field "${name}" has unknown type "${String(type)}" (use text, check or lines)`);
  }
}

function withTemplate<T extends TextField | LinesField>(field: T, template: string | undefined): T {
  return template === undefined ? field : { ...field, template };
}
