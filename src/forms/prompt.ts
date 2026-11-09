/**
 * LLM prompt generated from a FormDefinition (layout.yaml + meta.yaml), so the
 * key list can never drift from the form. `reference/prompt.md` is the
 * hand-written version this reproduces.
 */
import type { FormDefinition } from './definition';

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

/** Column where help comments start, as in reference/prompt.md. */
const COMMENT_COLUMN = 31;

function keyLine(key: string, isCheck: boolean, comment: string | undefined): string {
  const line = `${key}: ${isCheck ? 'true' : '""'}`;
  return comment ? `${line.padEnd(COMMENT_COLUMN - 1)} # ${comment}` : line;
}

/** One `# Section` comment per section, its keys below, blocks separated by a blank line. */
function keysBlock(def: FormDefinition): string {
  const blocks: string[] = [];
  for (const section of def.sections) {
    const lines = def.fields
      .filter((f) => f.section === section.id)
      .flatMap((f) =>
        f.dataKeys.map((k) => {
          const isCheck = f.type === 'check';
          return keyLine(k.key, isCheck, k.help?.en ?? (isCheck ? undefined : k.label.en));
        }),
      );
    if (def.appendix.section === section.id) lines.push(...appendixLines(def));
    if (lines.length === 0) continue;
    const title = def.appendix.section === section.id && def.appendix.help ? def.appendix.help.en : section.title.fr;
    blocks.push([`# ${title}`, ...lines].join('\n'));
  }
  return blocks.join('\n\n');
}

/** "Text must fit" rule, grouping data keys by max length (in first-seen order). */
function lengthRule(def: FormDefinition): string | undefined {
  const byLength = new Map<number, string[]>();
  for (const k of def.fields.flatMap((f) => f.dataKeys)) {
    if (k.maxLength === undefined) continue;
    byLength.set(k.maxLength, [...(byLength.get(k.maxLength) ?? []), `\`${k.key}\``]);
  }
  if (byLength.size === 0) return undefined;
  const parts = [...byLength].map(([n, keys]) => `${keys.join(', ')} under ${n} characters`);
  return `Text must fit: ${parts.join('; ')}.`;
}

/** The prompt users paste into a chatbot, followed by their event description. */
export function generatePrompt(def: FormDefinition): string {
  const rules = [...def.prompt.rules, lengthRule(def), `CIUP rules to keep in mind: ${def.ciupRules}`].filter(
    (r): r is string => r !== undefined,
  );
  return [
    def.prompt.intro,
    '',
    'Rules:',
    ...rules.map((r) => `- ${r}`),
    '',
    'Keys:',
    '',
    '```yaml',
    keysBlock(def),
    '```',
    '',
    'My event:',
    '',
    def.prompt.outro,
  ].join('\n');
}
