import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Donorbox actions, copied verbatim from the
 * "Filters"/"Ordering"/"Pagination" sections of Donorbox's own README
 * (`donorbox/donorbox-api`, fetched 2026-09-05).
 */

/**
 * `order` — "All Donorbox API endpoints support ordering. Use `order`
 * parameter with `asc|desc` possible values. The default is `desc`."
 */
export function orderParam(): Param {
  return {
    key: "order",
    label: "Order",
    type: "select",
    default: "desc",
    options: [
      { value: "asc", label: "Ascending" },
      { value: "desc", label: "Descending" },
    ],
  };
}

/**
 * `page` / `per_page` — "All Donorbox API endpoints support pagination...
 * The default page size (`per_page` parameter's value) is 50, maximum 100
 * allowed. If it exceeds the maximum, it will fallback to default."
 *
 * The response carries no pagination metadata (no `total`/`last_page` — see
 * `lib/client.ts`), so unlike this pack's envelope-backed APIs there is
 * nothing beyond these two inputs to surface back to the caller.
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "1-indexed page number.",
    },
    {
      key: "per_page",
      label: "Per page",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Maximum 100 — Donorbox falls back to its default of 50 above that, per its own docs.",
    },
    orderParam(),
  ];
}

export interface PaginationInput {
  page?: number;
  per_page?: number;
  order?: string;
}

export function paginationQuery(input: PaginationInput): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  if (input.page !== undefined) query.page = input.page;
  if (input.per_page !== undefined) query.per_page = input.per_page;
  if (input.order) query.order = input.order;
  return query;
}

/**
 * `date_from` / `date_to` — the Plan and Donation filters both document the
 * same set of accepted formats verbatim: "YYYY-mm-dd YYYY/mm/dd YYYYmmdd
 * dd-mm-YYYY".
 */
export function dateRangeParams(hint: string): Param[] {
  return [
    {
      key: "date_from",
      label: "Date from",
      type: "string",
      hint,
      placeholder: "2026-01-01",
    },
    {
      key: "date_to",
      label: "Date to",
      type: "string",
      hint,
      placeholder: "2026-12-31",
    },
  ];
}

export interface DateRangeInput {
  date_from?: string;
  date_to?: string;
}

export function dateRangeQuery(input: DateRangeInput): Record<string, string> {
  const query: Record<string, string> = {};
  if (input.date_from) query.date_from = input.date_from;
  if (input.date_to) query.date_to = input.date_to;
  return query;
}

/** Drop keys the caller left unset, so an unset filter is omitted rather than sent empty. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k as keyof T] = v as T[keyof T];
  }
  return out;
}
