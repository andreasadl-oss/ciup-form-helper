export type NoticeLevel = 'info' | 'warning' | 'error';

export interface Notices {
  show(message: string, level?: NoticeLevel): void;
  clear(): void;
}

/** Notices panel: page-level messages (errors, warnings). */
export function mountNotices(root: HTMLElement): Notices {
  return {
    show(message, level = 'info') {
      const p = document.createElement('p');
      p.className = `notice notice-${level}`;
      p.textContent = message;
      root.append(p);
    },
    clear() {
      root.replaceChildren();
    },
  };
}
