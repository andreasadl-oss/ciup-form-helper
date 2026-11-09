import { afterEach, describe, expect, it } from 'vitest';
import type { Lang } from '../i18n';
import { mountHeader } from './header';

afterEach(() => {
  document.body.innerHTML = '';
});

function setup(lang: Lang) {
  const root = document.createElement('header');
  document.body.append(root);
  const changes: Lang[] = [];
  mountHeader(root, { lang, onLangChange: (l) => changes.push(l) });
  const langButton = (label: string) => [...root.querySelectorAll('button')].find((b) => b.textContent === label)!;
  return { root, changes, langButton };
}

describe('header', () => {
  it('says it is an unofficial helper and that nothing leaves the browser', () => {
    const { root } = setup('en');
    expect(root.querySelector('h1')!.textContent).toBe('Event request form helper');
    expect(root.textContent).toMatch(/unofficial/i);
    expect(root.textContent).toMatch(/not a CIUP service/);
    expect(root.textContent).toMatch(/nothing you type is sent anywhere/i);
    expect(root.textContent).toMatch(/no analytics/i);
  });

  it('is in French when lang is fr', () => {
    const { root } = setup('fr');
    expect(root.textContent).toMatch(/non officiel/);
    expect(root.textContent).toMatch(/aucune mesure d'audience/);
  });

  it('marks the current language and reports a switch to the other one', () => {
    const { changes, langButton } = setup('en');
    expect(langButton('EN').getAttribute('aria-pressed')).toBe('true');
    expect(langButton('FR').getAttribute('aria-pressed')).toBe('false');
    langButton('EN').click();
    expect(changes).toEqual([]);
    langButton('FR').click();
    expect(changes).toEqual(['fr']);
  });
});
