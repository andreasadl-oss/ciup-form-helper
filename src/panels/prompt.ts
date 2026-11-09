import { ui, type Lang } from '../i18n';

export interface PromptPanelOptions {
  /** The generated prompt (see `generatePrompt`). */
  prompt: string;
  /** Interface language. Default: 'en'. */
  lang?: Lang;
}

/** Copy with the Clipboard API, or by selecting the box and `execCommand('copy')` where it is unavailable. */
async function copyText(box: HTMLTextAreaElement): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(box.value);
      return true;
    } catch {
      // Denied or insecure context: try the fallback.
    }
  }
  box.focus();
  box.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  }
}

/** Prompt panel (option A): instructions, the prompt in a read-only box, and a copy button. */
export function mountPromptPanel(root: HTMLElement, options: PromptPanelOptions): void {
  const t = ui[options.lang ?? 'en'].prompt;
  const heading = document.createElement('h2');
  heading.textContent = t.heading;

  const steps = document.createElement('ol');
  for (const text of t.steps) {
    const li = document.createElement('li');
    li.textContent = text;
    steps.append(li);
  }
  // Also say it in one line, so the instructions read well when skimmed.
  const summary = document.createElement('p');
  summary.textContent = t.summary;

  const box = document.createElement('textarea');
  box.className = 'prompt-box';
  box.readOnly = true;
  box.rows = 12;
  box.value = options.prompt;
  box.setAttribute('aria-label', t.boxLabel);

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = t.copy;

  const status = document.createElement('span');
  status.className = 'copy-status';
  status.setAttribute('role', 'status');

  button.addEventListener('click', async () => {
    status.textContent = (await copyText(box)) ? t.copied : t.copyFailed;
  });

  const actions = document.createElement('p');
  actions.append(button, ' ', status);

  root.append(heading, summary, steps, box, actions);
}
