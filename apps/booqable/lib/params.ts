import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and query-building helpers for the Booqable
 * actions. Every shape here is copied from `developers.booqable.com`'s own
 * "Filtering" / "Pagination" / "Sideposting" sections, not inferred.
 */

/** The `page[number]` / `page[size]` pair, identical on every list/search endpoint. */
export function paginationParams(): Param[] {
  return [
    {
      key: "pageNumber",
      label: "Page number",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Which page to fetch. Booqable's default page size is 20.",
      advanced: true,
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Results per page.",
      advanced: true,
    },
  ];
}

/** Turn the two pagination params into `page[number]` / `page[size]` query keys. */
export function pageQuery(
  input: { pageNumber?: number; pageSize?: number },
): Record<string, string | number | undefined> {
  return {
    "page[number]": input.pageNumber,
    "page[size]": input.pageSize,
  };
}

/** `?include=a,b,c` — JSON:API sideloading. Valid names vary per resource; documented per action. */
export const includeParam: Param = {
  key: "include",
  label: "Include related resources",
  type: "string",
  hint: "Comma-separated relationship names to sideload into the response's `included` array.",
  advanced: true,
};

/** `?sort=attr1,-attr2` — `-` prefix for descending. */
export const sortParam: Param = {
  key: "sort",
  label: "Sort",
  type: "string",
  placeholder: "-created_at",
  hint: "Comma-separated attribute names; prefix with `-` for descending, e.g. `-created_at`.",
  advanced: true,
};

/**
 * `filter[attribute][operator]=value` — a flat hash of `{ attribute: { operator:
 * value } }` (or `{ attribute: value }` as shorthand for `eq`). Supported
 * operators depend on the field's type (string/uuid/enum/integer/decimal/
 * float/boolean/date/datetime/hash/array) — each resource's docs list which
 * operators its own fields accept; this param stays generic across all of them.
 */
export const filterParam: Param = {
  key: "filter",
  label: "Filter",
  type: "json",
  advanced: true,
  hint: 'Booqable filter hash, e.g. {"archived":{"eq":false},"name":{"prefix":"Jo"}} — see the ' +
    "resource's Filters table in developers.booqable.com for supported attributes/operators.",
};

/**
 * Booqable's "advanced search" body for a `POST /{resource}/search` action —
 * an arbitrary nested boolean tree of `{ operator: "and"|"or", attributes: […] }`
 * combined with leaf filters, e.g.
 * `{"operator":"and","attributes":[{"operator":"or","attributes":[{"name":"john"},
 * {"name":"jane"}]}]}`. A superset of {@link filterParam}'s flat shape — both are
 * accepted by Booqable's `filter` key, so this reuses the same param.
 */
export const searchFilterParam: Param = {
  ...filterParam,
  hint:
    'Booqable filter hash — either flat ({"name":{"eq":"John"}}) or the nested advanced-search ' +
    'tree ({"operator":"and","attributes":[…]}) documented under "Advanced search".',
};

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
 * Flatten a `{ attribute: { operator: value } | value }` filter hash into
 * `filter[attribute][operator]` / `filter[attribute]` query keys, exactly the
 * shape `developers.booqable.com`'s own example URLs show
 * (`filter[starts_at][gte]=1980-11-16T09:00:00+00:00`).
 */
export function flattenFilter(filter?: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!filter) return out;
  for (const [key, val] of Object.entries(filter)) {
    if (val === null || val === undefined) continue;
    if (typeof val === "object" && !Array.isArray(val)) {
      for (const [op, opVal] of Object.entries(val as Record<string, unknown>)) {
        if (opVal === null || opVal === undefined) continue;
        out[`filter[${key}][${op}]`] = String(opVal);
      }
    } else {
      out[`filter[${key}]`] = String(val);
    }
  }
  return out;
}
