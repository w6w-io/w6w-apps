/**
 * Normalise a `multiselect` param into Hunter's comma-delimited string form.
 *
 * The host hands a `multiselect` value through as either a `string[]` or the
 * comma-joined string a caller typed directly, so both are accepted here
 * rather than at each call site. Returns `undefined` for nothing selected —
 * Hunter's own default is "no filter", never an empty string.
 */
export function toCommaList(v: string[] | string | undefined | null): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(",")).map((s) => String(s).trim()).filter(
    Boolean,
  );
  return items.length ? items.join(",") : undefined;
}

/** Same, but for the bracket-array filters (`position[]=CEO&position[]=CTO`). */
export function toArray(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(",")).map((s) => String(s).trim()).filter(
    Boolean,
  );
  return items.length ? items : undefined;
}
