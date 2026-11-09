/** Fetch a bundled asset (form PDF, font) as bytes; throws on an HTTP error. */
export async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}
