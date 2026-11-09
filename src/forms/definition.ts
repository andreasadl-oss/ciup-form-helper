/**
 * Form definition: `layout.yaml` + `meta.yaml` combined into one typed object.
 *
 * This is the single UI-facing API for a form (web form, prompt, validation,
 * email). The PDF renderer reads `layout.yaml` itself; this module only checks
 * that `meta.yaml` agrees with it.
 */
import { parse } from 'yaml';
import { templateKeys } from '../template';
import { getForm } from './registry';

export type FieldType = 'text' | 'check' | 'lines';

export interface Bilingual {
  en: string;
  fr: string;
}

/** One key the user writes in the data YAML / types into one input. */
export interface DataKeyDef {
  key: string;
  label: Bilingual;
  help?: Bilingual;
  /** Recommended maximum number of characters (warning only). */
  maxLength?: number;
  /** Expected format: `date` = jj/mm/aaaa, `time` = e.g. "19 h 30". */
  format?: 'date' | 'time';
}

export interface FieldDef {
  /** Layout field name, e.g. `maison` or `dates`. */
  key: string;
  type: FieldType;
  /** Section id (see `FormDefinition.sections`). */
  section: string;
  label: Bilingual;
  help?: Bilingual;
  /** Recommended maximum number of characters (warning only). */
  maxLength?: number;
  /** Id of the radio-like group this check field belongs to, if any. */
  group?: string;
  /** Layout template, e.g. `"Du {date_debut} au {date_fin}"`. */
  template?: string;
  /**
   * The data keys behind this field, in order. A plain field has one, named
   * like the field; a template field has one per `{key}` in its template.
   */
  dataKeys: DataKeyDef[];
}

export interface SectionDef {
  id: string;
  title: Bilingual;
}

/** Check fields of which at most one should be ticked (e.g. oui / non). */
export interface GroupDef {
  id: string;
  fields: string[];
}

/** The optional `appendix` data key (extra programme page). */
export interface AppendixDef {
  key: 'appendix';
  section: string;
  label: Bilingual;
  help?: Bilingual;
  /** Example value, shown in the prompt as the shape of `appendix`. */
  example: {
    title: string;
    intro?: string;
    outro?: string;
    columns: string[];
    col_widths?: number[];
    rows: string[][];
  };
}

export interface EmailDef {
  to: string;
  /** Template with `{data_key}` placeholders and optional `[...]` parts (see `src/email.ts`). */
  subject: string;
  /** Short French body, same template syntax as `subject`. */
  body: string;
  /** Data keys shortened first when the `mailto:` URL is too long (the event description). */
  truncateFirst: string[];
}

export interface PromptDef {
  intro: string;
  /** General rules. Max-length and CIUP rules are not included: build them from `maxLength` and `ciupRules`. */
  rules: string[];
  /** Placeholder the user replaces with their event description. */
  outro: string;
}

/**
 * Form-specific contradiction checks for validation (meta.yaml `validation`).
 * Each is optional: a form without it skips that check.
 */
export interface RulesDef {
  /** Check field that needs the appendix (CIUP: a concert needs its Sacem programme). */
  concert?: string;
  /** Check field that must not be ticked (CIUP: events must be free). */
  paidEntry?: string;
  /** Check field that needs `thirdPartySection` filled in (CIUP: a paid artist needs a convention). */
  paidArtist?: string;
  /** Section id of the third-party fields. Required with `paidArtist`. */
  thirdPartySection?: string;
}

export interface FormDefinition {
  id: string;
  email: EmailDef;
  /** Minimum number of days between sending the request and the event. */
  deadlineDays: number;
  prompt: PromptDef;
  ciupRules: string;
  appendix: AppendixDef;
  /** Sections in display order (form sections, then the appendix). */
  sections: SectionDef[];
  /** Layout fields, in layout.yaml order. */
  fields: FieldDef[];
  groups: GroupDef[];
  rules: RulesDef;
  /**
   * Every valid top-level key of the data YAML: the data keys of all fields
   * (template keys instead of template field names) plus `appendix`.
   */
  validKeys: string[];
}

type Raw = Record<string, unknown>;

interface RawMetaField {
  section: string;
  label: Bilingual;
  help?: Bilingual;
  max_length?: number;
  format?: 'date' | 'time';
}

const APPENDIX_KEY = 'appendix';

function dataKeyDef(key: string, m: RawMetaField): DataKeyDef {
  const def: DataKeyDef = { key, label: m.label };
  if (m.help) def.help = m.help;
  if (m.max_length !== undefined) def.maxLength = m.max_length;
  if (m.format) def.format = m.format;
  return def;
}

export function parseFormDefinition(id: string, layoutYaml: string, metaYaml: string): FormDefinition {
  const layout = parse(layoutYaml) as { fields: Record<string, Raw> };
  const meta = parse(metaYaml) as {
    fields: Record<string, RawMetaField>;
    sections: SectionDef[];
    groups: Record<string, { fields: string[] }>;
    recipient: string;
    deadline_days: number;
    email: { subject: string; body: string; truncate_first?: string[] };
    prompt: PromptDef;
    ciup_rules: string;
    appendix: Omit<AppendixDef, 'key'>;
    validation?: Record<string, string>;
  };

  const fail = (message: string): never => {
    throw new Error(`Form "${id}": ${message}`);
  };

  const sections = meta.sections.map(({ id, title }) => ({ id, title }));
  const sectionIds = new Set(sections.map((s) => s.id));
  const metaFor = (key: string): RawMetaField => {
    const m = meta.fields[key] ?? fail(`field "${key}" has no entry in meta.yaml`);
    if (!sectionIds.has(m.section)) fail(`field "${key}" has unknown section "${m.section}"`);
    return m;
  };

  const groups = Object.entries(meta.groups ?? {}).map(([gid, g]) => ({ id: gid, fields: g.fields }));
  for (const g of groups) {
    for (const f of g.fields) {
      const raw = layout.fields[f] ?? fail(`group "${g.id}" references "${f}", which is not in layout.yaml`);
      if (raw.type !== 'check') fail(`group "${g.id}" references "${f}", which is not a check field`);
    }
  }
  const groupOf = new Map(groups.flatMap((g) => g.fields.map((f) => [f, g.id] as const)));

  const fields = Object.entries(layout.fields).map(([key, raw]): FieldDef => {
    const m = metaFor(key);
    const template = raw.template as string | undefined;
    const keys = template ? templateKeys(template) : [key];
    return {
      key,
      type: (raw.type as FieldType | undefined) ?? 'text',
      section: m.section,
      label: m.label,
      help: m.help,
      maxLength: m.max_length,
      group: groupOf.get(key),
      template,
      dataKeys: keys.map((k) => dataKeyDef(k, metaFor(k))),
    };
  });

  const dataKeys = new Set(fields.flatMap((f) => f.dataKeys.map((k) => k.key)));
  const known = new Set([...fields.map((f) => f.key), ...dataKeys]);
  for (const key of Object.keys(meta.fields)) {
    if (!known.has(key)) fail(`meta.yaml field "${key}" is not in layout.yaml and not used in any template`);
  }
  for (const [name, template] of [['subject', meta.email.subject], ['body', meta.email.body]] as const) {
    for (const k of templateKeys(template)) {
      if (!dataKeys.has(k) && k !== APPENDIX_KEY) fail(`email ${name} uses {${k}}, which is not a data key`);
    }
  }
  const truncateFirst = meta.email.truncate_first ?? [];
  for (const k of truncateFirst) if (!dataKeys.has(k)) fail(`email truncate_first lists "${k}", which is not a data key`);

  const validKeys = [...dataKeys, APPENDIX_KEY];
  const rules = parseRules(meta.validation ?? {}, layout.fields, sectionIds, fail);

  return {
    id,
    email: { to: meta.recipient, subject: meta.email.subject, body: meta.email.body, truncateFirst },
    deadlineDays: meta.deadline_days,
    prompt: { intro: meta.prompt.intro, rules: meta.prompt.rules, outro: meta.prompt.outro },
    ciupRules: meta.ciup_rules,
    appendix: { key: APPENDIX_KEY, ...meta.appendix },
    sections,
    fields,
    groups,
    rules,
    validKeys,
  };
}

const RULE_NAMES = { concert: 'concert', paid_entry: 'paidEntry', paid_artist: 'paidArtist', third_party_section: 'thirdPartySection' } as const;

function parseRules(
  raw: Record<string, string>,
  layoutFields: Record<string, Raw>,
  sectionIds: Set<string>,
  fail: (message: string) => never,
): RulesDef {
  const rules: RulesDef = {};
  for (const [name, value] of Object.entries(raw)) {
    const key = RULE_NAMES[name as keyof typeof RULE_NAMES] ?? fail(`validation.${name} is not a known rule (${Object.keys(RULE_NAMES).join(', ')})`);
    if (key === 'thirdPartySection') {
      if (!sectionIds.has(value)) fail(`validation.third_party_section has unknown section "${value}"`);
    } else {
      const field = layoutFields[value] ?? fail(`validation.${name} references "${value}", which is not in layout.yaml`);
      if (field.type !== 'check') fail(`validation.${name} references "${value}", which is not a check field`);
    }
    rules[key] = value;
  }
  if (rules.paidArtist !== undefined && rules.thirdPartySection === undefined) fail('validation.paid_artist needs validation.third_party_section');
  return rules;
}

export function getFormDefinition(id: string): FormDefinition {
  const form = getForm(id);
  if (form.metaYaml === undefined) throw new Error(`Form "${id}" has no meta.yaml`);
  return parseFormDefinition(id, form.layoutYaml, form.metaYaml);
}
