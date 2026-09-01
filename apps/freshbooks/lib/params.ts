import type { Param } from "@w6w/types";

/** FreshBooks caps every list endpoint at 100 records per page regardless of
 * `per_page` (confirmed on freshbooks.com/api/limits), 1-based. */
export const page: Param = {
  key: "page",
  label: "Page",
  type: "number",
  default: 1,
  validation: { min: 1, integer: true },
};

export const perPage: Param = {
  key: "perPage",
  label: "Per page",
  type: "number",
  advanced: true,
  hint: "FreshBooks returns at most 100 records per page regardless of this value.",
  validation: { min: 1, max: 100, integer: true },
};

/**
 * Accounting-domain (clients/invoices/expenses) list filters are wrapped as
 * `search[<name>]=<value>` — see the Clients reference page's "Searches /
 * Filters" section for the exact query shape. Each resource documents its
 * own filter names, so this is a free-form object rather than enumerated
 * fields.
 */
export const searchFilters: Param = {
  key: "search",
  label: "Search filters",
  type: "json",
  advanced: true,
  hint:
    'JSON object of FreshBooks filter name -> value, sent as `search[name]=value`, e.g. { "email": "a@b.com" }. See the resource\'s "Searches / Filters" table in the FreshBooks API reference.',
};

/**
 * `timetracking`/`projects`-domain list filters are plain query params (not
 * `search[...]`-wrapped) — see the Time Entries reference page's "List Time
 * Entries From A Specific Day" example (`?started_from=...&started_to=...`).
 */
export const businessFilters: Param = {
  key: "filters",
  label: "Filters",
  type: "json",
  advanced: true,
  hint:
    'JSON object of query param -> value, e.g. { "started_from": "2026-01-01T00:00:00Z" }. See the resource\'s "Filters" table in the FreshBooks API reference.',
};

export const additionalFields: Param = {
  key: "additionalFields",
  label: "Additional fields",
  type: "json",
  advanced: true,
  hint: "JSON object merged into the request body, for fields not listed above.",
};
