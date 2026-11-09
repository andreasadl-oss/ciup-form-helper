/**
 * Validation wiring: on every state change, validate the data and show the
 * warnings next to their fields (FormPanel hooks) and as a summary in the
 * notices. Warnings never block the download.
 */
import type { Bilingual, FormDefinition } from '../forms/definition';
import type { FontMetrics, Layout } from '../render';
import type { AppState } from '../state';
import { formatWarning, messages as messageTables, type MessageTable } from '../validation/messages';
import { validate, type Warning } from '../validation/validate';
import type { FormPanel, Lang } from './form';
import type { Notices } from './notices';

export interface ValidationOptions {
  def: FormDefinition;
  layout: Layout;
  /** The PDF font; the fit and "can't draw" checks run once it resolves. */
  metrics: Promise<FontMetrics>;
  formPanel: Pick<FormPanel, 'setWarnings'>;
  notices: Pick<Notices, 'setSummary'>;
  /** Default: the current date. */
  today?: () => Date;
  /** Language of the summary labels and the messages. Default: 'en'. */
  lang?: Lang;
  /** Message texts. Default: the table for `lang`. */
  messages?: MessageTable;
}

export function connectValidation(state: AppState, options: ValidationOptions): void {
  const { def, layout, formPanel, notices } = options;
  const today = options.today ?? (() => new Date());
  const lang = options.lang ?? 'en';
  const table = options.messages ?? messageTables[lang];
  let metrics: FontMetrics | undefined;

  const labels = new Map<string, Bilingual>(def.fields.flatMap((f) => f.dataKeys.map((k) => [k.key, k.label] as const)));
  labels.set(def.appendix.key, def.appendix.label);

  const update = () => {
    const { result } = state.get();
    const warnings: Warning[] = result.ok ? validate(result.data, def, today(), { layout, metrics }) : [];
    const byKey = new Map<string, string[]>();
    for (const w of warnings) byKey.set(w.key, [...(byKey.get(w.key) ?? []), formatWarning(w, table)]);
    for (const key of def.validKeys) formPanel.setWarnings(key, byKey.get(key) ?? []);
    notices.setSummary(
      warnings.map((w) => {
        const label = labels.get(w.key);
        const text = formatWarning(w, table);
        return { text: label ? `${label[lang]}: ${text}` : text, prominent: w.severity === 'high' };
      }),
    );
  };

  update();
  state.subscribe(update);
  options.metrics.then(
    (m) => {
      metrics = m;
      update();
    },
    () => {
      // Font failed to load: the font checks stay off; the renderer reports the error.
    },
  );
}
