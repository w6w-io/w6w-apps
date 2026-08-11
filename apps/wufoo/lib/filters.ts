import type { QueryValue } from "./client.ts";

export { unwrap, WufooClient } from "./client.ts";

/**
 * Wufoo's entry filter syntax, which no form field can express directly.
 *
 * A filtered entries request looks like:
 *
 *     ?Filter1=Field1+Is_equal_to+Wufoo&Filter2=EntryId+Is_greater_than+1&match=AND
 *
 * — numbered parameters whose *value* is three space-separated parts. This
 * module turns the structured `{field, operator, value}` objects an action takes
 * into that shape, and validates the operator against the vendor's closed list
 * on the way. A misspelt operator is otherwise not an error: Wufoo returns an
 * empty result set, which reads exactly like "no matching entries".
 */

/** The operators Wufoo publishes. Anything else is rejected before it is sent. */
export const FILTER_OPERATORS = [
  "Contains",
  "Does_not_contain",
  "Begins_with",
  "Ends_with",
  "Is_less_than",
  "Is_greater_than",
  "Is_on",
  "Is_before",
  "Is_after",
  "Is_not_equal_to",
  "Is_equal_to",
  "Is_not_NULL",
] as const;

export interface WufooFilter {
  field: string;
  operator: string;
  value?: string | number | boolean;
}

/** Accept a `json` param as either a parsed value or the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/**
 * Number a list of filters into `Filter1`, `Filter2`, … query parameters.
 *
 * `Is_not_NULL` is the one operator that takes no value, so an empty value is
 * accepted for it and rejected for every other operator — sending
 * `Field1+Is_equal_to+` silently matches nothing.
 */
export function mergeFilters(
  query: Record<string, QueryValue>,
  filters: unknown,
): Record<string, QueryValue> {
  if (filters === undefined) return query;
  if (!Array.isArray(filters)) {
    throw new Error(
      "Filters must be an array of {field, operator, value} objects, e.g. " +
        '[{"field": "Field1", "operator": "Is_equal_to", "value": "Wufoo"}].',
    );
  }

  const out = { ...query };
  filters.forEach((raw, index) => {
    const filter = raw as Partial<WufooFilter>;
    const position = index + 1;
    if (!filter || typeof filter.field !== "string" || !filter.field) {
      throw new Error(`Filters: entry ${position} has no \`field\`.`);
    }
    if (typeof filter.operator !== "string" || !filter.operator) {
      throw new Error(`Filters: entry ${position} has no \`operator\`.`);
    }
    if (!(FILTER_OPERATORS as readonly string[]).includes(filter.operator)) {
      throw new Error(
        `Filters: entry ${position} uses an unknown operator "${filter.operator}". Wufoo accepts ` +
          `${FILTER_OPERATORS.join(", ")}.`,
      );
    }
    const value = filter.value === undefined || filter.value === null ? "" : String(filter.value);
    if (!value && filter.operator !== "Is_not_NULL") {
      throw new Error(
        `Filters: entry ${position} has no \`value\`. Only Is_not_NULL may omit one — every ` +
          "other operator would silently match nothing.",
      );
    }
    // Space-separated; the client's URLSearchParams encodes the spaces, which is
    // the same thing the vendor's `+` in a raw URL means.
    out[`Filter${position}`] = value
      ? `${filter.field} ${filter.operator} ${value}`
      : `${filter.field} ${filter.operator}`;
  });
  return out;
}
