/**
 * Warning texts, looked up by message key, in English and French
 * (`satisfies MessageTable` makes a missing key a type error).
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

const fr = {
  unknownKey: (p) => `Clé inconnue « ${p.key} ». Vouliez-vous dire « ${p.suggestion} » ?`,
  todo: () => 'Contient encore TODO : à compléter.',
  badDate: (p) => `« ${p.value} » n'est pas une date au format jj/mm/aaaa.`,
  datePast: () => 'Cette date est passée.',
  tooSoon: (p) =>
    `L'événement a lieu dans ${p.days} jours. Envoyez la demande au moins ${p.deadlineDays} jours avant : la CIUP peut refuser les demandes tardives.`,
  endBeforeStart: () => 'La date de fin est avant la date de début.',
  groupConflict: (p) => `Cochez une seule case parmi : ${p.fields}.`,
  concertNoAppendix: () => 'Un concert nécessite une page programme (Sacem) : ajoutez-la à la fin du formulaire.',
  paidEntry: () => "Les événements à la Cité doivent être gratuits : pas de vente d'entrées.",
  paidNoThirdParty: () => 'Un artiste rémunéré nécessite une convention : remplissez la section 5 (tiers).',
  tooWide: () => 'Trop long pour tenir sur le formulaire : raccourcissez.',
  tooLong: (p) =>
    `Trop long pour tenir sur le formulaire, même en petit (${p.lines} lignes, max ${p.maxLines}) : raccourcissez.`,
  unsupportedChars: (p) => `Ces caractères ne peuvent pas être imprimés et apparaîtront comme « ? » : ${p.chars}`,
} satisfies MessageTable;

export const messages = { en, fr };

export function formatWarning(warning: Warning, table: MessageTable = en): string {
  return table[warning.message](warning.params);
}
