/**
 * Warning texts, looked up by message key. Ticket 11 adds a `fr` table with
 * the same keys (`satisfies MessageTable` makes a missing key a type error).
 */
import type { MessageKey, Warning } from './validate';

export type MessageTable = Record<MessageKey, (params: Warning['params']) => string>;

const en: MessageTable = {
  unknownKey: (p) => `Unknown key "${p.key}". Did you mean "${p.suggestion}"?`,
  todo: () => 'Still contains TODO: fill this in.',
  badDate: (p) => `"${p.value}" is not a date written jj/mm/aaaa.`,
  datePast: () => 'This date is in the past.',
  tooSoon: (p) =>
    `The event is in ${p.days} days. Send the request at least ${p.deadlineDays} days ahead: the CIUP may refuse late requests.`,
  endBeforeStart: () => 'The end date is before the start date.',
  groupConflict: (p) => `Tick only one of: ${p.fields}.`,
  concertNoAppendix: () => 'A concert needs a programme page (Sacem): add it at the end of the form.',
  paidEntry: () => 'Events at the Cité must be free: no ticket sales.',
  paidNoThirdParty: () => 'A paid artist needs a convention: fill in section 5 (third party).',
  tooWide: () => 'Too long to fit on the form: shorten it.',
  tooLong: (p) => `Too long to fit on the form, even in small print (${p.lines} lines, max ${p.maxLines}): shorten it.`,
  unsupportedChars: (p) => `These characters can't be printed and will show as "?": ${p.chars}`,
};

export const messages = { en };

export function formatWarning(warning: Warning, table: MessageTable = en): string {
  return table[warning.message](warning.params);
}
