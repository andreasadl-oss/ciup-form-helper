export interface PromptPanelOptions {
  /** The generated prompt (see `generatePrompt`). */
  prompt: string;
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
  const heading = document.createElement('h2');
  heading.textContent = 'Option A: let a chatbot write the YAML';

  const steps = document.createElement('ol');
  for (const text of [
    'Copy the prompt below.',
    'Paste it into any chatbot (ChatGPT, Le Chat, Claude…).',
    'Replace the last part with a description of your event, in any language, and send it.',
    'Paste the YAML it gives back into the box below.',
  ]) {
    const li = document.createElement('li');
    li.textContent = text;
    steps.append(li);
  }
  // Also say it in one line, so the instructions read well when skimmed.
  const summary = document.createElement('p');
  summary.textContent = 'Copy → paste into a chatbot → describe your event → paste the YAML below.';

  const box = document.createElement('textarea');
  box.className = 'prompt-box';
  box.readOnly = true;
  box.rows = 12;
  box.value = options.prompt;
  box.setAttribute('aria-label', 'Prompt for the chatbot');

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Copy prompt';

  const status = document.createElement('span');
  status.className = 'copy-status';
  status.setAttribute('role', 'status');

  button.addEventListener('click', async () => {
    status.textContent = (await copyText(box))
      ? 'Copied!'
      : 'Could not copy automatically: the text is selected, press Ctrl+C (⌘C on Mac).';
  });

  const actions = document.createElement('p');
  actions.append(button, ' ', status);

  root.append(heading, summary, steps, box, actions);
}
