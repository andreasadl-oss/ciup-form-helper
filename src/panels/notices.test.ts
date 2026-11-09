import { afterEach, describe, expect, it } from 'vitest';
import { mountNotices } from './notices';

afterEach(() => {
  document.body.innerHTML = '';
});

function setup() {
  const root = document.createElement('div');
  document.body.append(root);
  return { root, notices: mountNotices(root) };
}

describe('notices summary', () => {
  it('lists the summary items, prominent ones first and marked', () => {
    const { root, notices } = setup();
    notices.setSummary([
      { text: 'Event name: too long', prominent: false },
      { text: 'Start date: too soon', prominent: true },
    ]);
    const items = [...root.querySelectorAll('.notice-summary li')];
    expect(items.map((li) => li.textContent)).toEqual(['Start date: too soon', 'Event name: too long']);
    expect(items[0].classList.contains('notice-prominent')).toBe(true);
    expect(items[1].classList.contains('notice-prominent')).toBe(false);
  });

  it('hides the summary when empty, and replaces it on each call', () => {
    const { root, notices } = setup();
    notices.setSummary([{ text: 'a', prominent: false }]);
    notices.setSummary([]);
    const summary = root.querySelector<HTMLElement>('.notice-summary')!;
    expect(summary.hidden).toBe(true);
    expect(summary.querySelectorAll('li')).toHaveLength(0);
  });

  it('keeps the summary when the other notices are cleared', () => {
    const { root, notices } = setup();
    notices.setSummary([{ text: 'a', prominent: false }]);
    notices.show('Could not create the PDF', 'error');
    notices.clear();
    expect(root.querySelector('.notice-error')).toBeNull();
    expect(root.querySelectorAll('.notice-summary li')).toHaveLength(1);
  });
});
