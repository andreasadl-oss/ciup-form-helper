import { describe, expect, it } from 'vitest';
import { buildMailto, MAX_MAILTO_LENGTH } from './email';
import { getFormDefinition } from './forms/definition';

const email = getFormDefinition('ciup-demande-manifestation-2026').email;

const full = {
  nom: 'Soirée acoustique',
  maison: 'Maison Exemple',
  date_debut: '12/12/2026',
  heure_debut: '19 h 30',
  heure_fin: '21 h 00',
  lieu: 'Grand salon',
};

/** Split a mailto URL back into its parts, decoding like a mail client would. */
function parse(url: string) {
  const m = /^mailto:([^?]*)\?subject=([^&]*)&body=(.*)$/.exec(url);
  if (!m) throw new Error(`not a mailto URL: ${url}`);
  return { to: m[1], subject: decodeURIComponent(m[2]), body: decodeURIComponent(m[3]), rawBody: m[3] };
}

describe('buildMailto', () => {
  it('addresses the CIUP events office with the event name and date in the subject', () => {
    const { to, subject } = parse(buildMailto(email, full));
    expect(to).toBe('evenements.internes@ciup.fr');
    expect(subject).toBe('Demande de manifestation : Soirée acoustique, 12/12/2026');
  });

  it('writes a short French body describing the event, with CRLF line breaks', () => {
    const { body } = parse(buildMailto(email, full));
    expect(body).toBe(
      [
        'Bonjour,',
        '',
        'Veuillez trouver ci-joint notre demande de manifestation « Soirée acoustique » (Maison Exemple), le 12/12/2026 de 19 h 30 à 21 h 00, Grand salon.',
        'Formulaire en pièce jointe.',
        '',
        'Cordialement,',
      ].join('\r\n'),
    );
  });

  it('mentions the programme as an attachment only when there is a programme page with rows', () => {
    const programme = { title: 'Programme', columns: ['#', 'Titre'], rows: [['1', 'Autumn Leaves']] };
    expect(parse(buildMailto(email, { ...full, appendix: programme })).body).toContain('\r\nFormulaire et programme en pièce jointe.\r\n');
    const empty = { ...programme, rows: [['', '']] };
    expect(parse(buildMailto(email, { ...full, appendix: empty })).body).toContain('\r\nFormulaire en pièce jointe.\r\n');
  });

  it('percent-encodes spaces, line breaks and special characters (no "+")', () => {
    const url = buildMailto(email, { ...full, nom: 'Jazz & Co = 100% ?' });
    expect(url).not.toContain('+');
    expect(url).not.toContain(' ');
    expect(url).toContain('%20');
    expect(parse(url).rawBody).toContain('%0D%0A');
    expect(parse(url).subject).toBe('Demande de manifestation : Jazz & Co = 100% ?, 12/12/2026');
  });

  it('drops the parts of a sentence whose placeholder is empty, without leaving gaps', () => {
    const { subject, body } = parse(buildMailto(email, { nom: 'Soirée', date_debut: '12/12/2026' }));
    expect(subject).toBe('Demande de manifestation : Soirée, 12/12/2026');
    expect(body).toContain('Veuillez trouver ci-joint notre demande de manifestation « Soirée », le 12/12/2026.');
  });

  it('still reads well with no data at all', () => {
    const { subject, body } = parse(buildMailto(email, {}));
    expect(subject).toBe('Demande de manifestation');
    expect(body).toContain('Veuillez trouver ci-joint notre demande de manifestation.\r\n');
    expect(body).not.toMatch(/ {2}|\( *\)|« *»| ,| \./);
  });

  it('treats TODO placeholders and non-text values as empty', () => {
    const { subject } = parse(buildMailto(email, { nom: 'TODO nom', date_debut: true }));
    expect(subject).toBe('Demande de manifestation');
  });

  it('keeps the URL under the length cap by truncating long values with an ellipsis', () => {
    const url = buildMailto(email, { ...full, nom: 'Très longue soirée '.repeat(200) });
    expect(url.length).toBeLessThanOrEqual(MAX_MAILTO_LENGTH);
    const { subject, body } = parse(url);
    expect(subject).toMatch(/^Demande de manifestation : Très longue soirée .*…, 12\/12\/2026$/);
    expect(body).toContain('Formulaire en pièce jointe.');
    expect(body).toContain('Cordialement,');
  });

  it('shortens the event name before any other value', () => {
    const lieu = 'Salle '.repeat(120).trim(); // ~720 characters, the longest value
    const url = buildMailto(email, { ...full, nom: 'x'.repeat(400), lieu });
    expect(url.length).toBeLessThanOrEqual(MAX_MAILTO_LENGTH);
    const { subject, body } = parse(url);
    expect(subject).toMatch(/^Demande de manifestation : x+…, 12\/12\/2026$/);
    expect(body).toContain(`, ${lieu}.`);
  });
});
