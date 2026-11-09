/** Test helper: the Noto Sans family with its bytes read from disk (no fetch in Node). */
import { readFileSync } from 'node:fs';
import { notoSansFrom } from './font';

const dir = 'src/assets/fonts';

export const notoSansFromDisk = notoSansFrom(async () => ({
  regular: new Uint8Array(readFileSync(`${dir}/NotoSans-Regular.ttf`)),
  bold: new Uint8Array(readFileSync(`${dir}/NotoSans-Bold.ttf`)),
}));
