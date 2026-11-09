import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { getFormDefinition } from './definition';
import { generatePrompt } from './prompt';

const def = getFormDefinition('ciup-demande-manifestation-2026');
const prompts = { en: generatePrompt(def, 'en'), fr: generatePrompt(def, 'fr') };

/** Contents of the ```yaml block of keys. */
function keysBlock(text: string): string {
  return text.split('```yaml\n')[1].split('\n```\n')[0];
}

describe('generatePrompt', () => {
  // The prompts as plain files, to read and proofread. After a deliberate change: `npx vitest run -u`.
  it('matches reference/prompt.md and reference/prompt.fr.md', async () => {
    await expect(prompts.en).toMatchFileSnapshot('../../reference/prompt.md');
    await expect(prompts.fr).toMatchFileSnapshot('../../reference/prompt.fr.md');
  });

  it.each(['en', 'fr'] as const)('lists every valid key of the form as a top-level YAML key (%s)', (lang) => {
    const keys = Object.keys(parse(keysBlock(prompts[lang])));
    expect(keys.sort()).toEqual([...def.validKeys].sort());
  });

  it('defaults to English', () => {
    expect(generatePrompt(def)).toBe(prompts.en);
  });

  it('asks the chatbot to interview the user until every key that applies has a value', () => {
    expect(prompts.en).toContain('Repeat step 2 until every key that applies has a value I gave or confirmed.');
    expect(prompts.fr).toContain("Recommence l'étape 2 jusqu'à ce que chaque clé");
  });

  it('writes help comments in the prompt language, French section titles in both', () => {
    const en = keysBlock(prompts.en).split('\n');
    const fr = keysBlock(prompts.fr).split('\n');
    expect(en).toContain('remunere_intermittent: true    # GUSO declaration');
    expect(fr).toContain('remunere_intermittent: true    # Déclaration GUSO');
    // Check fields without help get no comment; text fields fall back to the label.
    expect(en).toContain('type_conference: true');
    expect(en.filter((l) => l.startsWith('# 1.'))).toEqual(['# 1. Demandeur']);
    expect(fr.filter((l) => l.startsWith('# 1.'))).toEqual(['# 1. Demandeur']);
  });

  it('builds the length rule from max lengths and the CIUP rule from ciupRules', () => {
    expect(prompts.en.split('\n')).toContain(
      '- Text must fit: `maison`, `nom`, `lieu` under 60 characters; `interet` under 450 characters; `universites` under 300 characters.',
    );
    expect(prompts.fr.split('\n')).toContain(
      '- Le texte doit tenir : `maison`, `nom`, `lieu` en moins de 60 caractères ; `interet` en moins de 450 caractères ; `universites` en moins de 300 caractères.',
    );
    expect(prompts.fr).toContain('- Règles de la CIUP : Les manifestations à la Cité sont gratuites');
  });
});
