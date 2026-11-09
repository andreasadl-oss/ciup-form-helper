/**
 * Copy text with the Clipboard API, or with `execCommand('copy')` where it is
 * unavailable or denied. The fallback selects `box` when given (so the user can
 * press Ctrl+C if even that fails), else a temporary off-screen textarea.
 */
export async function copyText(text: string, box?: HTMLTextAreaElement): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Denied or insecure context: try the fallback.
    }
  }
  const target = box ?? document.createElement('textarea');
  if (!box) {
    target.value = text;
    target.setAttribute('readonly', '');
    target.style.position = 'fixed';
    target.style.left = '-9999px';
    document.body.append(target);
  }
  target.focus();
  target.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    if (!box) target.remove();
  }
}
