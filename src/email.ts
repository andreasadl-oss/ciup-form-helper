/**
 * The `mailto:` link that opens the user's own mail client with the request
 * pre-filled (recipient, subject, short French body). No email is sent from here.
 *
 * Templates come from meta.yaml (`EmailDef`): `{data_key}` placeholders, and
 * optional `[...]` parts that are dropped when any placeholder inside them is
 * empty, so a missing value removes its whole phrase instead of leaving a gap.
 * `{appendix}` fills in as nothing but counts as present when the programme
 * page has rows, so `[{appendix} et programme]` appears only with a programme.
 */
import type { EmailDef } from './forms/definition';
import { appendixHasRows, type FillData } from './render';

/** Some mail clients / OSes cut or refuse longer `mailto:` URLs. */
export const MAX_MAILTO_LENGTH = 1800;

const ELLIPSIS = '…';

export function buildMailto(email: EmailDef, data: FillData): string {
  const original = textValues(data);
  const values = new Map(original);
  let url = toUrl(email, values);

  // Too long: shorten the `truncateFirst` values (the event name), then the longest value, until it fits.
  while (url.length > MAX_MAILTO_LENGTH) {
    const next =
      email.truncateFirst.map((key) => [key, values.get(key) ?? ''] as const).find(([, value]) => value.length > 0) ??
      [...values].sort((a, b) => b[1].length - a[1].length)[0];
    if (!next || next[1].length === 0) break;
    const [key, value] = next;
    const kept = value.endsWith(ELLIPSIS) ? value.length - 1 : value.length;
    // Each character may take up to 9 URL characters, and may appear twice (subject + body).
    const cut = Math.max(1, Math.ceil((url.length - MAX_MAILTO_LENGTH) / 18));
    const n = Math.max(0, kept - cut);
    if (n === 0) values.delete(key);
    else values.set(key, original.get(key)!.slice(0, n).trimEnd() + ELLIPSIS);
    url = toUrl(email, values);
  }
  return url;
}

function toUrl(email: EmailDef, values: Map<string, string>): string {
  const subject = fill(email.subject, values);
  const body = fill(email.body, values).split(/\r?\n/).join('\r\n');
  return `mailto:${email.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Present values only: TODO markers, booleans and other objects count as empty; a programme page with rows as ''. */
function textValues(data: FillData): Map<string, string> {
  const values = new Map<string, string>();
  if (appendixHasRows(data.appendix)) values.set('appendix', '');
  for (const [key, raw] of Object.entries(data)) {
    const text = typeof raw === 'string' || typeof raw === 'number' ? String(raw).replace(/\s+/g, ' ').trim() : '';
    if (text && !/^TODO\b/i.test(text)) values.set(key, text);
  }
  return values;
}

function fill(template: string, values: Map<string, string>): string {
  const value = (key: string) => values.get(key) ?? '';
  const withOptional = template.replace(/\[([^[\]]*)\]/g, (_, part: string) =>
    [...part.matchAll(/\{(\w+)\}/g)].every((m) => values.has(m[1])) ? part : '',
  );
  return withOptional
    .replace(/\{(\w+)\}/g, (_, key: string) => value(key))
    .split('\n')
    .map((line) => line.replace(/ {2,}/g, ' ').replace(/ +([.,])/g, '$1').trim())
    .join('\n');
}
