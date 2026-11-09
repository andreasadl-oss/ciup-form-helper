import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountPromptPanel } from './prompt';

const PROMPT = 'You help residents…\n\nKeys:\n```yaml\nnom: ""\n```';

function mount() {
  const root = document.createElement('section');
  document.body.append(root);
  mountPromptPanel(root, { prompt: PROMPT });
  return {
    root,
    box: root.querySelector('textarea')!,
    copy: [...root.querySelectorAll('button')].find((b) => /copy/i.test(b.textContent ?? ''))!,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('prompt panel', () => {
  it('shows short instructions and the prompt in a read-only box', () => {
    const { root, box } = mount();
    expect(root.textContent).toMatch(/chatbot/i);
    expect(root.textContent).toMatch(/describe your event/i);
    expect(box.value).toBe(PROMPT);
    expect(box.readOnly).toBe(true);
  });

  it('copies the prompt with the Clipboard API and confirms', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const { root, copy } = mount();

    copy.click();

    await vi.waitFor(() => expect(root.textContent).toMatch(/copied/i));
    expect(writeText).toHaveBeenCalledWith(PROMPT);
  });

  it('falls back to selecting the box and execCommand("copy") without the Clipboard API', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
    let selected = '';
    document.execCommand = vi.fn(() => {
      const box = document.activeElement as HTMLTextAreaElement;
      selected = box.value.slice(box.selectionStart, box.selectionEnd);
      return true;
    });
    const { root, copy } = mount();

    copy.click();

    await vi.waitFor(() => expect(root.textContent).toMatch(/copied/i));
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(selected).toBe(PROMPT);
  });
});
