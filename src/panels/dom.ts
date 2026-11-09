/** Small DOM helpers shared by the panels. */

/** A new element with an optional class name and text. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** A `type="button"` button (never submits a form) that calls `onClick`. */
export function button(text: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', undefined, text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}
