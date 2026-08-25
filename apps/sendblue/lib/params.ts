/**
 * Small param-shaping helpers shared by the actions. Kept separate from
 * `client.ts` so a test can import just the pure functions with no fetch mock.
 */

/** Normalise a `multiselect`/array-of-strings param into a clean string array. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Accept a `json`-typed param as either an already-parsed value or the string
 * a form posted. The host hands a `json` param through in whichever shape it
 * arrived, so both are handled here rather than at each call site.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Same as {@link asOptionalJson}, but absence is a caller error. */
export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}
