/**
 * Shared param/query helpers for Lawmatics' list endpoints.
 *
 * Every "list" resource (Contacts, Matters/Prospects, Tasks, Notes, Events, …)
 * shares the same four query-param mini-languages, documented once in the
 * collection's "Param Guide" folder and confirmed identical across resources:
 *
 *   - `fields` — comma-separated attribute/relationship selection. Omit it and
 *     the vendor returns "a small set of commonly used default attributes".
 *   - `page` — 1-based page number. Pagination metadata rides in the response
 *     envelope's `meta`/`links`, never as a param.
 *   - `sort_by` / `sort_order` — defaults to `id` descending when unset.
 *   - `filter_by` (or `filter_field`) / `filter_on` (or `filter_value`) /
 *     `filter_with` (or `filter_operator`, default `=`) — exactly ONE filter
 *     is supported per request, and `filter_by` without `filter_on` is a
 *     documented 422.
 */
import type { Param } from "@w6w/types";

export interface ListQueryInput {
  fields?: string;
  page?: number;
  sortBy?: string;
  sortOrder?: string;
  filterBy?: string;
  filterOn?: string;
  filterWith?: string;
}

export const FILTER_OPERATORS = [
  { value: "=", label: "= (equals)" },
  { value: "!=", label: "!= (not equals)" },
  { value: "<", label: "< (less than)" },
  { value: "<=", label: "<= (less than or equal)" },
  { value: ">", label: "> (greater than)" },
  { value: ">=", label: ">= (greater than or equal)" },
  { value: "like", label: "like (fuzzy match, case-sensitive)" },
  { value: "ilike", label: "ilike (fuzzy match, case-insensitive)" },
  { value: "null", label: "null (field is empty)" },
  { value: "not_null", label: "not_null (field is present)" },
];

/** The four query-param groups shared by every "list" action. */
export function listParams(): Param[] {
  return [
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint: 'Comma-separated attribute/relationship names, e.g. "first_name,last_name,email". ' +
        'Leave blank for the vendor\'s small default set, or pass "all" for every field.',
      advanced: true,
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-based. Defaults to page 1.",
      advanced: true,
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "string",
      hint: '"id", "created_at", "updated_at", or any field returned by fields=all. ' +
        "Defaults to id, descending.",
      advanced: true,
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
      advanced: true,
    },
    {
      key: "filterBy",
      label: "Filter field",
      type: "string",
      hint: 'Field to filter on, e.g. "status" or "practice_area_id". Only one filter per request.',
      advanced: true,
    },
    {
      key: "filterOn",
      label: "Filter value",
      type: "string",
      hint: 'Required whenever "Filter field" is set (except with the null/not_null operators).',
      advanced: true,
    },
    {
      key: "filterWith",
      label: "Filter operator",
      type: "select",
      options: FILTER_OPERATORS,
      default: "=",
      advanced: true,
    },
  ];
}

/** Build the query object for a list request from `listParams()`'s input shape. */
export function listQuery(input: ListQueryInput): Record<string, string | number | undefined> {
  return {
    fields: input.fields,
    page: input.page,
    sort_by: input.sortBy,
    sort_order: input.sortOrder,
    filter_by: input.filterBy,
    filter_on: input.filterOn,
    filter_with: input.filterWith,
  };
}

/** The four polymorphic association types Lawmatics repeats across Tasks and Notes. */
export const ASSOCIATION_TYPES = [
  { value: "Prospect", label: "Matter (Prospect)" },
  { value: "Contact", label: "Contact" },
  { value: "Company", label: "Company" },
  { value: "Client", label: "Client" },
];

/**
 * Events are narrower: the docs state "The Prospect, Contact, or Client that
 * the appointment is with" — Company is not offered as an eventable type.
 */
export const EVENT_ASSOCIATION_TYPES = [
  { value: "Prospect", label: "Matter (Prospect)" },
  { value: "Contact", label: "Contact" },
  { value: "Client", label: "Client" },
];
