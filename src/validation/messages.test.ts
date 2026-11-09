import { describe, expect, it } from 'vitest';
import { formatWarning, messages, type MessageTable } from './messages';
import type { Warning } from './validate';

const w = (message: Warning['message'], params: Warning['params'] = {}): Warning => ({
  key: 'k',
  severity: 'normal',
  message,
  params,
});

describe('formatWarning', () => {
  it('fills the English message with its params', () => {
    expect(formatWarning(w('tooSoon', { days: 9, deadlineDays: 21 }))).toBe(
      'The event is in 9 days. Send the request at least 21 days ahead: the CIUP may refuse late requests.',
    );
    expect(formatWarning(w('unknownKey', { key: 'date_debt', suggestion: 'date_debut' }))).toBe(
      'Unknown key "date_debt". Did you mean "date_debut"?',
    );
  });

  it('says only "unknown key" when there is no suggestion', () => {
    expect(formatWarning(w('unknownKey', { key: 'couleur' }))).toBe('Unknown key "couleur".');
    expect(formatWarning(w('unknownKey', { key: 'couleur' }), messages.fr)).toBe('Clé inconnue « couleur ».');
  });

  it('has an English text for every message', () => {
    for (const [key, text] of Object.entries(messages.en)) {
      expect(text({ key: 'x', suggestion: 'y', days: 1, deadlineDays: 21, value: 'v', fields: 'a, b', lines: 5, maxLines: 4, chars: '🎸' }), key).not.toBe('');
    }
  });

  it('has a French table', () => {
    expect(formatWarning(w('tooSoon', { days: 9, deadlineDays: 21 }), messages.fr)).toBe(
      "L'événement a lieu dans 9 jours. Envoyez la demande au moins 21 jours avant : la CIUP peut refuser les demandes tardives.",
    );
    expect(formatWarning(w('unknownKey', { key: 'date_debt', suggestion: 'date_debut' }), messages.fr)).toBe(
      'Clé inconnue « date_debt ». Vouliez-vous dire « date_debut » ?',
    );
  });

  it('uses another table when given one (for translations)', () => {
    const fr = { ...messages.en, todo: () => 'À compléter' } satisfies MessageTable;
    expect(formatWarning(w('todo'), fr)).toBe('À compléter');
  });
});
