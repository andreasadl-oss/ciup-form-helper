import { LANGS, ui, type Lang } from '../i18n';

export interface HeaderOptions {
  lang: Lang;
  /** Called when the user picks another language. */
  onLangChange: (lang: Lang) => void;
}

/** Page header: title, language switch, unofficial-helper notice and privacy note. */
export function mountHeader(root: HTMLElement, options: HeaderOptions): void {
  const t = ui[options.lang].page;

  const top = document.createElement('div');
  top.className = 'header-top';
  const title = document.createElement('h1');
  title.textContent = t.title;

  const switcher = document.createElement('div');
  switcher.className = 'lang-switch';
  switcher.setAttribute('role', 'group');
  switcher.setAttribute('aria-label', t.language);
  for (const lang of LANGS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.lang = lang;
    button.textContent = lang.toUpperCase();
    button.setAttribute('aria-pressed', String(lang === options.lang));
    button.addEventListener('click', () => {
      if (lang !== options.lang) options.onLangChange(lang);
    });
    switcher.append(button);
  }
  top.append(title, switcher);

  const unofficial = document.createElement('p');
  unofficial.className = 'notice notice-unofficial';
  unofficial.textContent = t.unofficial;
  const privacy = document.createElement('p');
  privacy.className = 'notice notice-privacy';
  privacy.textContent = t.privacy;

  root.replaceChildren(top, unofficial, privacy);
}
