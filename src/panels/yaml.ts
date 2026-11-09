import type { AppSnapshot, AppState, YamlError } from '../state';

const ORIGIN = 'yaml-panel';

export interface YamlPanelOptions {
  /** Text the "Load example" button puts in the textarea. */
  exampleYaml: string;
}

/** YAML panel: textarea bound to the app state, with parse errors shown below it. */
export function mountYamlPanel(root: HTMLElement, state: AppState, options: YamlPanelOptions): void {
  const label = document.createElement('label');
  label.htmlFor = 'yaml-input';
  label.textContent = 'Paste the YAML here';

  const loadExample = document.createElement('button');
  loadExample.type = 'button';
  loadExample.textContent = 'Load example';
  loadExample.addEventListener('click', () => state.setYaml(options.exampleYaml, 'load-example'));

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

  root.append(label, loadExample, textarea, error);

  const show = ({ yaml, result }: AppSnapshot, origin?: string) => {
    // Don't rewrite the user's own typing: it would move the cursor.
    if (origin !== ORIGIN) textarea.value = yaml;
    error.textContent = result.ok ? '' : describe(result.error);
    error.hidden = result.ok;
    textarea.setAttribute('aria-invalid', String(!result.ok));
  };
  show(state.get());
  state.subscribe(show);
}

/** "Line 2, column 7: <parser message, without its own position suffix>". */
function describe({ message, line, column }: YamlError): string {
  const text = message.replace(/ at line \d+, column \d+:?/, '');
  if (line === undefined) return text;
  return `Line ${line}${column === undefined ? '' : `, column ${column}`}: ${text}`;
}
