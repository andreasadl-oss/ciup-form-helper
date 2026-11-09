import { describe, expect, it } from 'vitest';
import { stringify } from 'yaml';
import { getFormDefinition, parseFormDefinition } from './definition';

const label = (s: string) => ({ en: s, fr: s });

const fixtureLayout = stringify({
  pdf: 'form.pdf',
  fields: {
    nom: { page: 0, x: 0, y: 0, w: 100 },
    oui: { page: 0, type: 'check', x: 0, y: 0 },
    non: { page: 0, type: 'check', x: 0, y: 0 },
    dates: { page: 0, x: 0, y: 0, w: 100, template: 'Du {date_debut} au {date_fin}' },
  },
});

function fixtureMeta(changes: (meta: any) => void = () => {}): string {
  const meta = {
    recipient: 'x@example.org',
    deadline_days: 21,
    email: { subject: '{nom}', body: 'Bonjour {nom} {date_debut}' },
    prompt: { intro: 'i', rules: ['r'], outro: 'o' },
    ciup_rules: 'c',
    sections: [{ id: 's', title: label('S') }],
    appendix: { section: 's', label: label('A'), example: { title: 't', columns: ['#'], rows: [['1']] } },
    groups: { g: { fields: ['oui', 'non'] } },
    fields: {
      nom: { section: 's', label: label('Nom') },
      oui: { section: 's', label: label('Oui') },
      non: { section: 's', label: label('Non') },
      dates: { section: 's', label: label('Dates') },
      date_debut: { section: 's', label: label('Début'), format: 'date' },
      date_fin: { section: 's', label: label('Fin'), format: 'date' },
    },
  };
  changes(meta);
  return stringify(meta);
}

describe('parseFormDefinition consistency checks', () => {
  const parseWith = (changes: (meta: any) => void) => () =>
    parseFormDefinition('f', fixtureLayout, fixtureMeta(changes));

  it('accepts a meta.yaml that matches the layout', () => {
    expect(parseFormDefinition('f', fixtureLayout, fixtureMeta()).validKeys).toEqual([
      'nom',
      'oui',
      'non',
      'date_debut',
      'date_fin',
      'appendix',
    ]);
  });

  it('rejects a layout field without meta', () => {
    expect(parseWith((m) => delete m.fields.oui)).toThrow(/oui.*no entry in meta\.yaml/);
  });

  it('rejects a template key without meta', () => {
    expect(parseWith((m) => delete m.fields.date_fin)).toThrow(/date_fin.*no entry in meta\.yaml/);
  });

  it('rejects a meta field that is neither a layout field nor a template key', () => {
    expect(parseWith((m) => (m.fields.typo = { section: 's', label: label('?') }))).toThrow(/typo.*not in layout\.yaml/);
  });

  it('rejects a field in an unknown section', () => {
    expect(parseWith((m) => (m.fields.nom.section = 'nope'))).toThrow(/nom.*unknown section "nope"/);
  });

  it('rejects groups that reference missing or non-check fields', () => {
    expect(parseWith((m) => (m.groups.g.fields = ['oui', 'peut-etre']))).toThrow(/group "g".*peut-etre/);
    expect(parseWith((m) => (m.groups.g.fields = ['oui', 'nom']))).toThrow(/group "g".*nom.*not a check field/);
  });

  it('rejects mail templates that use unknown data keys', () => {
    expect(parseWith((m) => (m.email.body = 'Bonjour {dates}'))).toThrow(/email.*\{dates\}/);
    expect(parseWith((m) => (m.email.body = 'Formulaire[{appendix} et programme]'))).not.toThrow();
    expect(parseWith((m) => (m.email.truncate_first = ['dates']))).toThrow(/truncate_first.*dates/);
  });
});

const FORM_ID = 'ciup-demande-manifestation-2026';

describe('getFormDefinition (CIUP form)', () => {
  const def = getFormDefinition(FORM_ID);

  it('lists the layout fields in layout order with type, section and bilingual labels', () => {
    expect(def.id).toBe(FORM_ID);
    expect(def.fields.map((f) => f.key).slice(0, 6)).toEqual([
      'maison',
      'nature_programmation',
      'nature_partenariat',
      'nature_residents',
      'nature_interne',
      'nom',
    ]);
    expect(def.fields.at(-1)!.key).toBe('universites');

    const maison = def.fields.find((f) => f.key === 'maison')!;
    expect(maison).toMatchObject({ type: 'text', section: 'demandeur', maxLength: 60 });
    expect(maison.label.fr).toBe('Maison ou service demandeur');
    expect(maison.label.en).toBeTruthy();
    expect(maison.help?.en).toMatch(/Fondation Deutsch de la Meurthe/);

    expect(def.fields.find((f) => f.key === 'type_concert')!.type).toBe('check');
    expect(def.fields.find((f) => f.key === 'interet')).toMatchObject({ type: 'lines', section: 'interet', maxLength: 450 });
  });

  it('gives each field the data keys the user fills in; template fields use their template keys', () => {
    const dates = def.fields.find((f) => f.key === 'dates')!;
    expect(dates.template).toBe('Du {date_debut} au {date_fin}');
    expect(dates.dataKeys.map((k) => k.key)).toEqual(['date_debut', 'date_fin']);
    expect(dates.dataKeys[0]).toMatchObject({ format: 'date', label: { fr: 'Date de début' } });

    const horaires = def.fields.find((f) => f.key === 'horaires')!;
    expect(horaires.dataKeys.map((k) => [k.key, k.format])).toEqual([
      ['heure_debut', 'time'],
      ['heure_fin', 'time'],
    ]);

    const nom = def.fields.find((f) => f.key === 'nom')!;
    expect(nom.template).toBeUndefined();
    expect(nom.dataKeys).toEqual([{ key: 'nom', label: nom.label, maxLength: 60 }]);
  });

  it('lists sections 1-6 and the appendix in order, with EN and FR titles', () => {
    expect(def.sections.map((s) => s.id)).toEqual([
      'demandeur',
      'evenement',
      'personnalites',
      'dispositifs',
      'tiers',
      'interet',
      'appendix',
    ]);
    expect(def.sections[0].title).toEqual({ en: '1. Applicant', fr: '1. Demandeur' });
  });

  it('marks radio-like check fields with their group', () => {
    expect(def.groups).toContainEqual({ id: 'concert_ouvert', fields: ['concert_ouvert_oui', 'concert_ouvert_non'] });
    expect(def.groups).toContainEqual({ id: 'entree_tarif', fields: ['entree_gratuite', 'entree_payante'] });
    const field = (key: string) => def.fields.find((f) => f.key === key)!;
    expect(field('artiste_non').group).toBe('artiste');
    expect(field('remunere_oui').group).toBe('remunere');
    expect(field('soiree_externe').group).toBe('soiree_public');
    expect(field('type_concert').group).toBeUndefined();
  });

  it('carries the recipient, mail templates and the 21-day deadline', () => {
    expect(def.email.to).toBe('evenements.internes@ciup.fr');
    expect(def.email.subject).toBe('Demande de manifestation[ : {nom}][, {date_debut}]');
    expect(def.email.body).toMatch(/^Bonjour,/);
    expect(def.email.body).toContain('Formulaire[{appendix} et programme] en pièce jointe.');
    expect(def.email.truncateFirst).toEqual(['nom']);
    expect(def.deadlineDays).toBe(21);
  });

  it('carries the prompt texts, CIUP rules and the appendix description', () => {
    expect(def.prompt.intro).toMatch(/^You help residents of the Cité internationale universitaire de Paris/);
    expect(def.prompt.rules).toContain('Write the values in French.');
    expect(def.prompt.outro).toMatch(/^<Describe it in a few sentences/);
    expect(def.ciupRules).toMatch(/^Events at the Cité are free; no ticket or alcohol sales\./);
    expect(def.appendix).toMatchObject({ key: 'appendix', section: 'appendix', label: { fr: 'Page programme' } });
    expect(def.appendix.example.columns).toEqual(['#', 'Titre', 'Compositeur(s) / auteur(s)']);
  });

  it('lists every valid top-level data key: plain fields, template keys and appendix, not template field names', () => {
    expect(def.validKeys).toContain('maison');
    expect(def.validKeys).toContain('type_concert');
    expect(def.validKeys).toContain('date_debut');
    expect(def.validKeys).toContain('heure_fin');
    expect(def.validKeys).toContain('appendix');
    expect(def.validKeys).not.toContain('dates');
    expect(def.validKeys).not.toContain('horaires');
    // 51 layout fields - 2 template fields + 4 template keys + appendix
    expect(def.validKeys).toHaveLength(54);
    expect(new Set(def.validKeys).size).toBe(def.validKeys.length);
  });
});
