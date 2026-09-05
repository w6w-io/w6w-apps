import type { OutputField, Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the LGL actions, built from the "Search",
 * "Sort", and pagination parameter descriptions repeated verbatim across
 * LGL's own per-resource API sub-documents (`/api-docs/json/lgl_api/v1/*.json`,
 * fetched 2026-09-05).
 */

/**
 * `limit` / `offset` — every documented list endpoint states the same
 * defaults: "Number of entries to return. Default: 25" / "Start at given
 * entry. Default: 0". No maximum is documented anywhere in the reference.
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 25,
      validation: { integer: true, min: 1 },
      hint: "Number of entries to return. LGL's documented default is 25; no maximum is stated.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      validation: { integer: true, min: 0 },
      hint: "Start at this entry (0-indexed).",
    },
  ];
}

export interface PaginationInput {
  limit?: number;
  offset?: number;
}

export function paginationQuery(input: PaginationInput): Record<string, number> {
  const query: Record<string, number> = {};
  if (input.limit !== undefined) query.limit = input.limit;
  if (input.offset !== undefined) query.offset = input.offset;
  return query;
}

/**
 * `q[]` — every documented `/search.json` endpoint requires at least one
 * filter clause, and its own worked examples are embedded `field=value`
 * strings (`q[]=name=brady`, `q[]=updated_from=2016-01-01`) rather than a
 * single free-text term. LGL's reference does not enumerate the full set of
 * valid filter field names for any resource beyond its one worked example
 * plus the fields also usable in `sort` — so this stays a raw clause list
 * rather than a set of named filter dropdowns this app would otherwise be
 * guessing at.
 */
export function filtersParam(example: string): Param {
  return {
    key: "filters",
    label: "Filters",
    type: "json",
    required: true,
    default: [],
    hint:
      `One or more "field=value" clauses, e.g. ["${example}"]. LGL requires at least one filter ` +
      "for a search call — see the action description for the fields its own docs confirm.",
  };
}

export function filtersQuery(input: { filters?: string[] }): string[] {
  return (input.filters ?? []).filter((f) => typeof f === "string" && f.length > 0);
}

/** `expand` — comma-separated list of related data structures to embed. */
export function expandParam(values: string[]): Param {
  return {
    key: "expand",
    label: "Expand",
    type: "multiselect",
    options: values.map((v) => ({ value: v, label: v })),
    hint: "Related data structures to embed in each result, comma-joined on the wire.",
  };
}

export interface ExpandInput {
  expand?: string[];
}

export function expandQuery(input: ExpandInput): string | undefined {
  if (!input.expand || input.expand.length === 0) return undefined;
  return input.expand.join(",");
}

/** `sort` — one of the resource's documented fields, `!`-suffixed to reverse. */
export function sortParams(fields: string[]): Param[] {
  return [
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      options: fields.map((f) => ({ value: f, label: f })),
    },
    {
      key: "sortDescending",
      label: "Reverse order",
      type: "boolean",
      default: false,
      hint: 'Appends "!" to the sort field, per LGL\'s documented syntax (e.g. "sort=name!").',
    },
  ];
}

export interface SortInput {
  sort?: string;
  sortDescending?: boolean;
}

export function sortQuery(input: SortInput): string | undefined {
  if (!input.sort) return undefined;
  return input.sortDescending ? `${input.sort}!` : input.sort;
}

export { compact } from "./client.ts";

/** The list envelope's own fields, shared as `output` by every list action. */
export const envelopeOutput: OutputField[] = [
  { key: "items", type: "array", label: "Items" },
  { key: "items_count", type: "number", label: "Items returned" },
  { key: "total_items", type: "number", label: "Total items available" },
  { key: "next_link", type: "string", label: "Link to the next page, if any" },
];
