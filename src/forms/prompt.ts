/**
 * LLM prompt generated from a FormDefinition (layout.yaml + meta.yaml), so the
 * key list can never drift from the form. The prompt follows the interface
 * language; the keys and values stay French, like the form.
 * `reference/prompt.md` (EN) and `reference/prompt.fr.md` hold the expected output.
 */
import type { Bilingual, FormDefinition } from './definition';

type Lang = keyof Bilingual;

/** Headings and generated rule texts; the rest of the prompt comes from meta.yaml. */
const words = {
  en: {
    steps: 'How we work:',
    rules: 'YAML rules:',
    keys: 'Keys:',
    event: 'My event:',
    fit: (parts: string[]) => `Text must fit: ${parts.join('; ')}.`,
    under: (keys: string, n: number) => `${keys} under ${n} characters`,
    ciup: (rules: string) => `CIUP rules: ${rules}`,
  },
  fr: {
    steps: 'Déroulement :',
    rules: 'Règles du YAML :',
    keys: 'Clés :',
    event: 'Mon événement :',
    fit: (parts: string[]) => `Le texte doit tenir : ${parts.join(' ; ')}.`,
    under: (keys: string, n: number) => `${keys} en moins de ${n} caractères`,
    ciup: (rules: string) => `Règles de la CIUP : ${rules}`,
  },
} satisfies Record<Lang, unknown>;

/** A YAML flow sequence, e.g. `["#", "Titre"]` or `[25, 170]`. JSON is valid YAML. */
const flow = (items: readonly (string | number)[]) => `[${items.map((i) => JSON.stringify(i)).join(', ')}]`;

/** The appendix example as YAML, with rows and columns in compact flow style. */
function appendixLines(def: FormDefinition): string[] {
  const { title, intro, outro, columns, col_widths, rows } = def.appendix.example;
  const lines = [`${def.appendix.key}:`, `  title: ${JSON.stringify(title)}`];
  if (intro !== undefined) lines.push(`  intro: ${JSON.stringify(intro)}`);
  if (outro !== undefined) lines.push(`  outro: ${JSON.stringify(outro)}`);
  lines.push(`  columns: ${flow(columns)}`);
  if (col_widths) lines.push(`  col_widths: ${flow(col_widths)}`);
  lines.push('  rows:', ...rows.map((row) => `    - ${flow(row)}`));
  return lines;
}

/** Column where help comments start. */
const COMMENT_COLUMN = 31;

function keyLine(key: string, isCheck: boolean, comment: string | undefined): string {
  const line = `${key}: ${isCheck ? 'true' : '""'}`;
  return comment ? `${line.padEnd(COMMENT_COLUMN - 1)} # ${comment}` : line;
}

/** One `# Section` comment per section (French titles, like the form), its keys below, blocks separated by a blank line. */
function keysBlock(def: FormDefinition, lang: Lang): string {
  const blocks: string[] = [];
  for (const section of def.sections) {
    const lines = def.fields
      .filter((f) => f.section === section.id)
      .flatMap((f) =>
        f.dataKeys.map((k) => {
          const isCheck = f.type === 'check';
          return keyLine(k.key, isCheck, k.help?.[lang] ?? (isCheck ? undefined : k.label[lang]));
        }),
      );
    if (def.appendix.section === section.id) lines.push(...appendixLines(def));
    if (lines.length === 0) continue;
    const title = def.appendix.section === section.id && def.appendix.help ? def.appendix.help[lang] : section.title.fr;
    blocks.push([`# ${title}`, ...lines].join('\n'));
  }
  return blocks.join('\n\n');
}

/** "Text must fit" rule, grouping data keys by max length (in first-seen order). */
function lengthRule(def: FormDefinition, lang: Lang): string | undefined {
  const byLength = new Map<number, string[]>();
  for (const k of def.fields.flatMap((f) => f.dataKeys)) {
    if (k.maxLength === undefined) continue;
    byLength.set(k.maxLength, [...(byLength.get(k.maxLength) ?? []), `\`${k.key}\``]);
  }
  if (byLength.size === 0) return undefined;
  const w = words[lang];
  return w.fit([...byLength].map(([n, keys]) => w.under(keys.join(', '), n)));
}

/** The prompt users paste into a chatbot, followed by their event description. */
export function generatePrompt(def: FormDefinition, lang: Lang = 'en'): string {
  const w = words[lang];
  const texts = def.prompt[lang];
  const rules = [...texts.rules, lengthRule(def, lang), w.ciup(def.ciupRules[lang])].filter(
    (r): r is string => r !== undefined,
  );
  return [
    texts.intro,
    '',
    w.steps,
    ...texts.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    w.rules,
    ...rules.map((r) => `- ${r}`),
    '',
    w.keys,
    '',
    '```yaml',
    keysBlock(def, lang),
    '```',
    '',
    w.event,
    '',
    texts.outro,
  ].join('\n');
}
