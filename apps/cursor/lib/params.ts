import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Cursor Admin API actions.
 *
 * Every shape here is copied from the documented request/response bodies at
 * `cursor.com/docs/account/teams/admin-api` (fetched 2026-09-05), not inferred.
 */

/**
 * `startDate` / `endDate` — epoch milliseconds, inclusive on both ends.
 *
 * The doc is explicit that these are **not** the "defaults to 7 days ago"
 * shortcuts the general Analytics API accepts (relative shortcuts, ISO
 * strings, `YYYY-MM-DD`) — the Admin API's usage/spend/events endpoints only
 * ever documented epoch milliseconds in their examples, so that is the only
 * form this app emits.
 */
export function dateRangeParams(): Param[] {
  return [
    {
      key: "startDate",
      label: "Start date",
      type: "number",
      required: true,
      hint: "Epoch milliseconds. Inclusive.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "endDate",
      label: "End date",
      type: "number",
      required: true,
      hint: "Epoch milliseconds. Inclusive.",
      validation: { integer: true, min: 0 },
    },
  ];
}

/**
 * `page` / `pageSize` — 1-indexed pagination shared by the spend, usage-events
 * and daily-usage-data endpoints.
 *
 * Left both optional everywhere: on `daily-usage-data` specifically, the doc
 * says providing *neither* returns only active users with no pagination
 * envelope, while providing *both* switches to the full-roster, paginated
 * shape — two different response shapes from one endpoint, driven by whether
 * these are present at all. See `actions/daily-usage-get.ts`.
 */
export function pageParams(defaultPageSize: number, pageSizeHint: string): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-indexed.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: defaultPageSize,
      hint: pageSizeHint,
      validation: { integer: true, min: 1 },
    },
  ];
}

/** Encoded user id, e.g. `user_PDSPmvukpYgZEDXsoNirw3CFhy`. */
export const userIdParam: Param = {
  key: "userId",
  label: "User ID",
  type: "string",
  hint: "Encoded user id (e.g. user_PDSPmvukpYgZEDXsoNirw3CFhy), from the members list.",
};

/** Encoded group id, e.g. `group_PDSPmvukpYgZEDXsoNirw3CFhy`. */
export const groupIdParam: Param = {
  key: "groupId",
  label: "Group ID",
  type: "string",
  required: true,
  hint: "The encoded group id (e.g. group_PDSPmvukpYgZEDXsoNirw3CFhy).",
};

/** `billingCycle` — ISO date naming which cycle to query. Defaults to the current one. */
export const billingCycleParam: Param = {
  key: "billingCycle",
  label: "Billing cycle",
  type: "string",
  hint:
    "ISO date (e.g. 2025-01-15) naming which billing cycle to read. Defaults to the current one.",
};

/** Catalog provider id — a path segment, not a display name (e.g. `openai`, `anthropic`). */
export const providerIdParam: Param = {
  key: "provider",
  label: "Provider",
  type: "string",
  required: true,
  placeholder: "openai",
  hint: "Catalog provider id, e.g. openai or anthropic — not the display name.",
};

/** Catalog model id — a path segment, not a display name (e.g. `gpt-5.4`). */
export const modelIdParam: Param = {
  key: "model",
  label: "Model",
  type: "string",
  required: true,
  placeholder: "gpt-5.4",
  hint: "Catalog model id, e.g. gpt-5.4 or claude-opus-4-6 — not the display name.",
};
