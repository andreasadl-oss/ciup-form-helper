/** Small predicates about data values, shared so validation, email, YAML and the web form agree. */

/** A value the user still has to fill in: contains the word TODO (as the prompt asks the chatbot to write). */
export function isTodo(text: string): boolean {
  return /\bTODO\b/i.test(text);
}

/** "Not filled in" in the data contract: missing, empty, or an unticked checkbox (`false`). */
export function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === '' || value === false;
}

/** A YAML mapping / plain object (not null, not an array). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
