/**
 * The app's Noto Sans family (OFL, see src/assets/fonts/OFL.txt). Vite emits
 * the TTFs as separate assets; they are fetched on the first render only, so
 * they never block first paint.
 */
import boldUrl from '../assets/fonts/NotoSans-Bold.ttf?url';
import regularUrl from '../assets/fonts/NotoSans-Regular.ttf?url';
import { notoSansFrom } from './font';

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load font ${url}: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

export const notoSans = notoSansFrom(async () => {
  const [regular, bold] = await Promise.all([fetchBytes(regularUrl), fetchBytes(boldUrl)]);
  return { regular, bold };
});
