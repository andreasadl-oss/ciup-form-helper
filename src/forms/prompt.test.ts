import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import referenceMd from '../../reference/prompt.md?raw';
import { getFormDefinition } from './definition';
import { generatePrompt } from './prompt';

const def = getFormDefinition('ciup-demande-manifestation-2026');
const prompt = generatePrompt(def);

/** The hand-written reference prompt: everything below its `---` line. */
const reference = referenceMd
  .replace(/\r\n/g, '\n')
  .split('\n---\n')[1]
  .trim();

/** Contents of the ```yaml block that follows "Keys:". */
function keysBlock(text: string): string {
  return text.split('Keys:\n\n```yaml\n')[1].split('\n```\n')[0];
}

describe('generatePrompt', () => {
  it('lists every valid key of the form as a top-level YAML key', () => {
    const keys = Object.keys(parse(keysBlock(prompt)));
    expect(keys.sort()).toEqual([...def.validKeys].sort());
  });

  it('writes the same keys, placeholders and appendix example as the reference, in order', () => {
    // Key lines without their comments; comment-only lines and blanks dropped.
    const keyLines = (text: string) =>
      keysBlock(text)
        .split('\n')
        .map((l) => l.replace(/\s+# .*$/, '').trimEnd())
        .filter((l) => l && !l.startsWith('#'));
    expect(keyLines(prompt)).toEqual(keyLines(reference));
  });

  it('groups keys under a comment per section, separated by blank lines', () => {
    const headers = keysBlock(prompt)
      .split('\n')
      .filter((l) => l.startsWith('#'));
    expect(headers).toEqual([
      '# 1. Demandeur',
      "# 2. Informations sur l'événement",
      '# 3. Personnalités attendues',
      '# 4. Dispositifs et prestations',
      '# 5. Informations tiers',
      "# 6. Intérêt de la manifestation",
      '# Concerts only: programme for the Sacem declaration (extra page).',
    ]);
    expect(keysBlock(prompt)).toContain('nature_interne: true\n\n# 2.');
  });

  it('adds the English help as an aligned comment (label for text fields without help)', () => {
    const lines = keysBlock(prompt).split('\n');
    // Exact lines from reference/prompt.md.
    expect(lines).toContain('remunere_intermittent: true    # GUSO declaration');
    expect(lines).toContain('date_debut: ""                 # jj/mm/aaaa');
    // Check fields without help get no comment; text fields fall back to the label.
    expect(lines).toContain('type_conference: true');
    expect(lines).toContain('nom: ""                        # Event name');
  });

  it('starts with the intro and rules, ends with the "My event:" footer, like the reference', () => {
    const before = (text: string) => text.split('\nKeys:\n')[0];
    const after = (text: string) => text.split('\n```\n\n').at(-1);
    const withoutGenerated = (text: string) =>
      before(text)
        .split('\n')
        .filter((l) => !l.startsWith('- Text must fit:') && !l.startsWith('- CIUP rules'));
    expect(withoutGenerated(prompt)).toEqual(withoutGenerated(reference));
    expect(after(prompt)).toBe(after(reference));
  });

  it('builds the length rule from max lengths and the CIUP rule from ciupRules', () => {
    const rules = prompt.split('\n');
    expect(rules).toContain(
      '- Text must fit: `maison`, `nom`, `lieu` under 60 characters; `interet` under 450 characters; `universites` under 300 characters.',
    );
    expect(rules).toContain(
      '- CIUP rules to keep in mind: Events at the Cité are free; no ticket or alcohol sales. Paid artists or partnerships require a convention (section 5); otherwise leave section 5 out.',
    );
  });
});
