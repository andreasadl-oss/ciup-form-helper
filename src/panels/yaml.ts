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
  /** Asks the user to confirm clearing. Default: `window.confirm`. */
  confirm?: (question: string) => boolean;
}

function makeButton(text: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.addEventListener('click', onClick);
  return button;
}

/** YAML panel: textarea bound to the app state, with parse errors shown below it. */
export function mountYamlPanel(root: HTMLElement, state: AppState, options: YamlPanelOptions): void {
  const t = ui[options.lang ?? 'en'].yaml;
  const label = document.createElement('label');
  label.htmlFor = 'yaml-input';
  label.textContent = t.label;

  const buttons = document.createElement('div');
  buttons.className = 'button-row';
  buttons.append(makeButton(t.loadExample, () => state.setYaml(options.exampleYaml, 'load-example')));
  const { clearDraft } = options;
  if (clearDraft) {
    const confirm = options.confirm ?? ((q: string) => window.confirm(q));
    buttons.append(
      makeButton(t.clearDraft, () => {
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
  textarea.setAttribute('aria-describedby', error.id);

  root.append(label, buttons, textarea, error);

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
function describe({ message, line, column, kind }: YamlError, t: UiStrings['yaml']): string {
  const text = kind === 'notMapping' ? t.notMapping : message.replace(/ at line \d+, column \d+:?/, '');
  if (line === undefined) return text;
  return `${t.position(line, column)}: ${text}`;
}
