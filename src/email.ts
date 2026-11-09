/**
 * The `mailto:` link that opens the user's own mail client with the request
 * pre-filled (recipient, subject, short French body). No email is sent from here.
 *
 * Templates come from meta.yaml (`EmailDef`): `{data_key}` placeholders, and
 * optional `[...]` parts that are dropped when any placeholder inside them is
 * empty, so a missing value removes its whole phrase instead of leaving a gap.
 */
import type { EmailDef } from './forms/definition';
import type { FillData } from './render';

/** Some mail clients / OSes cut or refuse longer `mailto:` URLs. */
export const MAX_MAILTO_LENGTH = 1800;

const ELLIPSIS = '…';

export function buildMailto(email: EmailDef, data: FillData): string {
  const original = textValues(data);
  const values = new Map(original);
  let url = toUrl(email, values);

  // Too long: shorten the longest value (normally the event name) until it fits.
  while (url.length > MAX_MAILTO_LENGTH) {
    const longest = [...values].sort((a, b) => b[1].length - a[1].length)[0];
    if (!longest || longest[1].length === 0) break;
    const [key, value] = longest;
    const kept = value.endsWith(ELLIPSIS) ? value.length - 1 : value.length;
    // Each character may take up to 9 URL characters, and may appear twice (subject + body).
    const cut = Math.max(1, Math.ceil((url.length - MAX_MAILTO_LENGTH) / 18));
    const n = Math.max(0, kept - cut);
    values.set(key, n === 0 ? '' : original.get(key)!.slice(0, n).trimEnd() + ELLIPSIS);
    url = toUrl(email, values);
  }
  return url;
}

function toUrl(email: EmailDef, values: Map<string, string>): string {
  const subject = fill(email.subject, values);
  const body = fill(email.body, values).split(/\r?\n/).join('\r\n');
  return `mailto:${email.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Usable text values only: TODO markers, booleans and objects count as empty. */
function textValues(data: FillData): Map<string, string> {
  const values = new Map<string, string>();
  for (const [key, raw] of Object.entries(data)) {
    const text = typeof raw === 'string' || typeof raw === 'number' ? String(raw).replace(/\s+/g, ' ').trim() : '';
    if (text && !/^TODO\b/i.test(text)) values.set(key, text);
  }
  return values;
}

function fill(template: string, values: Map<string, string>): string {
  const value = (key: string) => values.get(key) ?? '';
  const withOptional = template.replace(/\[([^[\]]*)\]/g, (_, part: string) =>
    [...part.matchAll(/\{(\w+)\}/g)].every((m) => value(m[1])) ? part : '',
  );
  return withOptional
    .replace(/\{(\w+)\}/g, (_, key: string) => value(key))
    .split('\n')
    .map((line) => line.replace(/ {2,}/g, ' ').replace(/ +([.,])/g, '$1').trim())
    .join('\n');
}
