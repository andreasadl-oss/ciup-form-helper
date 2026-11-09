import { button } from './dom';
import { ui, type Lang, type UiStrings } from '../i18n';
import type { AppSnapshot, AppState, YamlError } from '../state';

const ORIGIN = 'yaml-panel';

export interface YamlPanelOptions {
  /** Text the "Load example" button puts in the textarea. */
  exampleYaml: string;
  /** Interface language. Default: 'en'. */
  lang?: Lang;
  /** Adds a "Clear draft" button: after confirmation it empties the YAML and calls this (e.g. to forget the saved draft). */
  clearDraft?: () => void;
  /** Asks the user to confirm clearing, or replacing their YAML with the example. Default: `window.confirm`. */
  confirm?: (question: string) => boolean;
}

/** YAML panel: textarea bound to the app state, with parse errors shown below it. */
export function mountYamlPanel(root: HTMLElement, state: AppState, options: YamlPanelOptions): void {
  const t = ui[options.lang ?? 'en'].yaml;
  const label = document.createElement('label');
  label.htmlFor = 'yaml-input';
  label.textContent = t.label;

  const buttons = document.createElement('div');
  buttons.className = 'button-row';
  const confirm = options.confirm ?? ((q: string) => window.confirm(q));
  buttons.append(
    button(t.loadExample, () => {
      // The example replaces the user's YAML (and with it the saved draft): ask first when there is any.
      const current = state.get().yaml;
      if (current.trim() !== '' && current !== options.exampleYaml && !confirm(t.replaceConfirm)) return;
      state.setYaml(options.exampleYaml, 'load-example');
    }),
  );
  const { clearDraft } = options;
  if (clearDraft) {
    buttons.append(
      button(t.clearDraft, () => {
        if (!confirm(t.clearConfirm)) return;
        state.setYaml('', 'clear-draft');
        clearDraft();
      }),
    );
  }

  const textarea = document.createElement('textarea');
  textarea.id = 'yaml-input';
  textarea.rows = 16;
  textarea.spellcheck = false;
  textarea.addEventListener('input', () => state.setYaml(textarea.value, ORIGIN));

  const error = document.createElement('pre');
  error.className = 'yaml-error';
  error.id = 'yaml-error';
  error.setAttribute('role', 'alert');
  // Nothing to press after pasting: say so, next to the box.
  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.id = 'yaml-hint';
  hint.textContent = t.hint;
  textarea.setAttribute('aria-describedby', `${hint.id} ${error.id}`);

  root.append(label, hint, buttons, textarea, error);

  const show = ({ yaml, result }: AppSnapshot, origin?: string) => {
    // Don't rewrite the user's own typing: it would move the cursor.
    if (origin !== ORIGIN) textarea.value = yaml;
    error.textContent = result.ok ? '' : describe(result.error, t);
    error.hidden = result.ok;
    textarea.setAttribute('aria-invalid', String(!result.ok));
  };
  show(state.get());
  state.subscribe(show);
}

/** "Line 2, column 7: <parser message, without its own position suffix>". */
function describe(error: YamlError, t: UiStrings['yaml']): string {
  const text = error.kind === 'notMapping' ? t.notMapping : error.message.replace(/ at line \d+, column \d+:?/, '');
  if (error.line === undefined) return text;
  return `${t.position(error.line, error.column)}: ${text}`;
}
