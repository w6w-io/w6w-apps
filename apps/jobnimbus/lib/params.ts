import type { Param } from "@w6w/types";
import { asOptionalJson, type QueryValue } from "./client.ts";

/**
 * `?actor=<email>` — documented as a common parameter on every JobNimbus
 * endpoint (see `lib/client.ts`). Declared once and reused so every action
 * offers it identically rather than each re-describing it.
 */
export const ACTOR_PARAM: Param = {
  key: "actor",
  label: "Actor (email)",
  type: "string",
  advanced: true,
  hint: "A JobNimbus team member's email. The request inherits that person's permissions and " +
    'attribution — a created/updated record\'s "Created By" becomes them, and a read returns ' +
    "only what they can see. Requires the API token's Access Profile to have admin-level " +
    "permissions; leave blank to act as the token itself.",
};

/** The common list-endpoint params JobNimbus documents for contacts/jobs/tasks/activities. */
export const LIST_PARAMS: Param[] = [
  {
    key: "size",
    label: "Page size",
    type: "number",
    default: 50,
    hint: "1-1000. JobNimbus's own default is 1000 (its documented maximum); this app " +
      "prefills a smaller page.",
    validation: { min: 1, max: 1000, integer: true },
  },
  {
    key: "from",
    label: "Offset",
    type: "number",
    default: 0,
    advanced: true,
    hint: "Zero-based starting point, for paging past the first page of results.",
    validation: { min: 0, integer: true },
  },
  {
    key: "sort_field",
    label: "Sort field",
    type: "string",
    default: "date_created",
    advanced: true,
  },
  {
    key: "sort_direction",
    label: "Sort direction",
    type: "select",
    default: "desc",
    advanced: true,
    options: [
      { value: "desc", label: "Descending" },
      { value: "asc", label: "Ascending" },
    ],
  },
  {
    key: "filter",
    label: "Filter",
    type: "json",
    advanced: true,
    hint: "JobNimbus's own Elasticsearch-syntax filter object, e.g. " +
      '{"must":[{"term":{"first_name":"John"}}]}. See JobNimbus\'s API docs for the full syntax.',
  },
  ACTOR_PARAM,
];

/** Build the query object `LIST_PARAMS` produces, for `JobNimbusClient.list`. */
export function listQuery(input: Record<string, unknown>): Record<string, QueryValue> {
  return {
    size: input.size as number | undefined,
    from: input.from as number | undefined,
    sort_field: input.sort_field as string | undefined,
    sort_direction: input.sort_direction as string | undefined,
    filter: encodeFilter(input.filter),
    actor: input.actor as string | undefined,
  };
}

/** JobNimbus's `filter` query parameter is URL-encoded JSON; `URLSearchParams` handles the encoding. */
export function encodeFilter(filter: unknown): string | undefined {
  const parsed = asOptionalJson<unknown>(filter, "filter");
  return parsed === undefined ? undefined : JSON.stringify(parsed);
}
