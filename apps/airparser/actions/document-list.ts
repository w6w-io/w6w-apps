import type { ActionDefinition } from "@w6w/types";
import { AirparserClient } from "../lib/client.ts";

/**
 * `GET /inboxes/{inboxId}/docs` — an inbox's documents, with paging, a date
 * range, a search query, and a status filter.
 *
 * **The `status` wire format is inferred, not documented.** The docs say
 * `status` is an "array of document statuses" but show no example of how an
 * array is encoded in the query string. This app sends it as a repeated
 * `status=` query parameter (`?status=parsed&status=fail`) — the conventional
 * Express/Nest reading — but that has not been confirmed against a live
 * account. If Airparser instead expects a single comma-joined value, this
 * filter would silently return an unfiltered list rather than erroring, so
 * treat its result as unverified until checked against a real inbox.
 *
 * **The response envelope is not shown either** — the docs give paging
 * *parameters* but no sample response body, so this action returns whatever
 * the endpoint answers rather than assuming a `{items, total}` shape.
 */
interface Input {
  inboxId: string;
  page?: number;
  perPage?: number;
  from?: string;
  to?: string;
  q?: string;
  status?: string[];
}

const documentStatusOptions = [
  { value: "importing", label: "Importing" },
  { value: "new", label: "New" },
  { value: "converting", label: "Converting" },
  { value: "parsing", label: "Parsing" },
  { value: "parsed", label: "Parsed" },
  { value: "fail", label: "Failed" },
  { value: "fail_pp", label: "Failed (post-processing)" },
  { value: "skipped", label: "Skipped" },
  { value: "skipped_pp", label: "Skipped (post-processing)" },
  { value: "quota", label: "Quota exceeded" },
  { value: "exception", label: "Exception" },
];

const documentList: ActionDefinition<Input, Record<string, unknown>> = {
  key: "document-list",
  type: "search",
  resource: "document",
  title: "List Documents",
  description:
    "List an inbox's documents, filtered by date range, search query and/or status. See the " +
    "action's own description for a caution about the unconfirmed status-filter wire format.",
  params: [
    { key: "inboxId", label: "Inbox", type: "string", required: true },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "1-based page number.",
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: 25,
      validation: { integer: true, min: 1, max: 500 },
      hint: "1 to 500. Airparser's own default is 25.",
    },
    {
      key: "from",
      label: "From date",
      type: "date",
      hint: "YYYY-MM-DD.",
    },
    {
      key: "to",
      label: "To date",
      type: "date",
      hint: "YYYY-MM-DD.",
    },
    { key: "q", label: "Search query", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: documentStatusOptions,
      hint: "Leave empty to return documents in any status. See the action description for a " +
        "caveat about how multiple values are sent on the wire.",
    },
  ],

  execute(input, ctx) {
    return new AirparserClient(ctx).request<Record<string, unknown>>(
      `/inboxes/${encodeURIComponent(input.inboxId)}/docs`,
      {
        query: {
          page: input.page,
          per_page: input.perPage,
          from: input.from,
          to: input.to,
          q: input.q,
          status: input.status,
        },
      },
    );
  },
};

export default documentList;
