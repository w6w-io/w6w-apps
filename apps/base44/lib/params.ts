import type { Param } from "@w6w/types";

/**
 * Cursor pagination, shared by every Monitoring API list endpoint. Each caps
 * a page at 50 rows and returns one page per call rather than auto-following
 * `pagination.next_cursor` — a workflow step loops on the returned cursor
 * itself, so a run never blocks on an unbounded fetch-everything loop.
 */
export const PAGE_PARAMS: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    hint: "Items per page. Base44 caps this at 50.",
    validation: { min: 1, max: 50, integer: true },
  },
  {
    key: "cursor",
    label: "Cursor",
    type: "string",
    hint: "From a previous response's `pagination.next_cursor`. Cursors expire after 24 hours.",
    advanced: true,
  },
];

/**
 * The credit-consumption date range every Monitoring endpoint but
 * `get-app-analytics`/`get-superagent-analytics` treats as optional,
 * defaulting to the current billing period.
 */
export const OPTIONAL_RANGE_PARAMS: Param[] = [
  {
    key: "from",
    label: "From",
    type: "string",
    hint: "YYYY-MM-DD. Required if `to` is set. Defaults to the current billing period's start.",
    advanced: true,
  },
  {
    key: "to",
    label: "To",
    type: "string",
    hint: "YYYY-MM-DD. Required if `from` is set. Defaults to today.",
    advanced: true,
  },
];

/** The date range `get-app-analytics`/`get-superagent-analytics` require outright. */
export const REQUIRED_RANGE_PARAMS: Param[] = [
  { key: "from", label: "From", type: "string", required: true, hint: "YYYY-MM-DD." },
  { key: "to", label: "To", type: "string", required: true, hint: "YYYY-MM-DD." },
];
