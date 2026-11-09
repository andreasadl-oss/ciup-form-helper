export type NoticeLevel = 'info' | 'warning' | 'error';

export interface SummaryItem {
  text: string;
  /** Shown first and highlighted (e.g. "less than 21 days away"). */
  prominent: boolean;
}

export interface Notices {
  show(message: string, level?: NoticeLevel): void;
  /** Removes the messages added with `show` (not the summary). */
  clear(): void;
  /** Replace the warnings summary list (validation); an empty list hides it. */
  setSummary(items: SummaryItem[]): void;
}

/** Notices panel: page-level messages (errors, warnings) and the validation summary. */
export function mountNotices(root: HTMLElement): Notices {
  const messages = document.createElement('div');
  messages.className = 'notice-messages';
  const summary = document.createElement('ul');
  summary.className = 'notice notice-warning notice-summary';
  summary.hidden = true;
  root.append(messages, summary);

  return {
    show(message, level = 'info') {
      const p = document.createElement('p');
      p.className = `notice notice-${level}`;
      p.textContent = message;
      messages.append(p);
    },
    clear() {
      messages.replaceChildren();
    },
    setSummary(items) {
      const sorted = [...items.filter((i) => i.prominent), ...items.filter((i) => !i.prominent)];
      summary.replaceChildren(
        ...sorted.map((item) => {
          const li = document.createElement('li');
          li.textContent = item.text;
          if (item.prominent) li.className = 'notice-prominent';
          return li;
        }),
      );
      summary.hidden = sorted.length === 0;
    },
  };
}
