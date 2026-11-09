/**
 * `{key}` placeholders, as used by layout.yaml templates ("Du {date_debut} au
 * {date_fin}") and the meta.yaml email templates. One parser for both.
 */
const PLACEHOLDER = /\{(\w+)\}/g;

/** The placeholder keys of `template`, in order (repeats included). */
export function templateKeys(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map((m) => m[1]);
}

/** `template` with each `{key}` replaced by `value(key)`. */
export function fillTemplate(template: string, value: (key: string) => string): string {
  return template.replace(PLACEHOLDER, (_, key: string) => value(key));
}
