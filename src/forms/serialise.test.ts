import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { getFormDefinition } from './definition';
import { dataToYaml } from './serialise';

const def = getFormDefinition('ciup-demande-manifestation-2026');
const example = parse(readFileSync('reference/example-data.yaml', 'utf8')) as Record<string, unknown>;

describe('dataToYaml', () => {
  it('round-trips the example data', () => {
    expect(parse(dataToYaml(def, example))).toEqual(example);
  });

  it('omits unticked checkboxes and empty text', () => {
    const yaml = dataToYaml(def, { nom: 'Fête', type_concert: false, entree_libre: true, lieu: '', maison: null });
    expect(parse(yaml)).toEqual({ nom: 'Fête', entree_libre: true });
    expect(yaml).not.toMatch(/type_concert|lieu|maison/);
  });

  it('writes keys in form order, unknown keys last', () => {
    const yaml = dataToYaml(def, { typo_key: 'x', universites: 'U', maison: 'M' });
    expect(Object.keys(parse(yaml))).toEqual(['maison', 'universites', 'typo_key']);
  });

  it('writes appendix columns and rows in compact flow style', () => {
    const yaml = dataToYaml(def, { appendix: example.appendix });
    expect(yaml).toContain('columns: [ "#", "Titre", "Compositeur(s) / auteur(s)" ]');
    expect(yaml).toContain('- [ "1", "Autumn Leaves", "Joseph Kosma / Jacques Prévert" ]');
  });

  it('returns an empty string for empty data', () => {
    expect(dataToYaml(def, {})).toBe('');
  });
});
