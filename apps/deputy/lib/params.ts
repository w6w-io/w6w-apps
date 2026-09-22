import type { Param } from "@w6w/types";
import { asOptionalJson, csv, MAX_PAGE_SIZE } from "./client.ts";

/**
 * Params and helpers shared by the `POST /resource/{Object}/QUERY` actions.
 *
 * The QUERY payload is documented in Deputy's own generated V1 Resource API
 * reference (`developer.deputy.com/reference/searchemployee-1`, read
 * 2026-09-22) as:
 *
 * ```json
 * {
 *   "search": { "s1": { "field": "Id", "data": 1, "type": "eq" } },
 *   "sort":   { "StartTime": "desc" },
 *   "start":  0,
 *   "max":    100,
 *   "join":   ["EmployeeObject"]
 * }
 * ```
 *
 * with `start` *"Pagination offset (0-indexed)"*, `max` *"Max records per page
 * (server caps at 500)"* (default 100) and `join` *"Related ORMs to expand
 * inline"*. The comparison operators are the documented enum `eq`, `ne`, `gt`,
 * `lt`, `ge`, `le`, `is`, `is not`, `in`, `not in`, `starts`, `contains`.
 *
 * **This is where the contract's own research note was out of date, and the
 * live docs won.** Deputy's *hand-written* guide pages never mention `start` or
 * `max` on QUERY, which is why an earlier reading of this API concluded that
 * paging a large table was impossible. The generated reference Deputy publishes
 * for the same endpoint documents both, with bounds — so this app pages with
 * them, and the README says where the discrepancy came from.
 *
 * `search` and `sort` are exposed as `json` params rather than enumerated
 * fields because the field names differ per resource and per Deputy install
 * (custom fields are real columns here): a workflow passes Deputy's own clause
 * object straight through, and `Employee/INFO` — the `employee-fields` action —
 * lists what is queryable in that install.
 */
export interface QueryInput {
  search?: unknown;
  sort?: unknown;
  join?: unknown;
  max?: unknown;
  cursor?: unknown;
}

export interface SearchPage<T> {
  items: T[];
  count: number;
  /** Offset this page started at, 0-indexed. */
  start: number;
  /** Page size actually requested. */
  max: number;
  /** Pass back as `cursor`; absent when this page ended the table. */
  nextCursor?: number;
}

export const ID_PARAM = (label: string, hint: string): Param => ({
  key: "id",
  label,
  type: "number",
  required: true,
  validation: { integer: true, min: 1 },
  hint,
});

export const SEARCH_PARAM: Param = {
  key: "search",
  label: "Filter (search clauses)",
  type: "json",
  hint: "Deputy's own `search` object, keyed by an arbitrary clause id — e.g. " +
    '`{"s1":{"field":"Active","data":true,"type":"eq"},"s2":{"field":"StartDate",' +
    '"data":"2026-01-01","type":"ge"}}`. Operators: eq, ne, gt, lt, ge, le, is, ' +
    '"is not", in, not in, starts, contains. Field names are the resource’s own — list ' +
    "them with the matching *-fields action.",
};

export const SORT_PARAM: Param = {
  key: "sort",
  label: "Sort",
  type: "json",
  hint: 'Field → `"asc"` or `"desc"`, e.g. `{"StartTime":"desc"}`.',
};

export const JOIN_PARAM: Param = {
  key: "join",
  label: "Expand related objects",
  type: "string",
  placeholder: "EmployeeObject",
  hint: "Comma-separated related ORMs to expand inline, e.g. `EmployeeObject` on a Timesheet or " +
    "`CompanyObject` on an OperationalUnit. Comma-separated here rather than a JSON array " +
    "because Deputy only ever accepts a list of names.",
};

export const MAX_PARAM: Param = {
  key: "max",
  label: "Page size",
  type: "number",
  default: 100,
  advanced: true,
  validation: { integer: true, min: 1, max: MAX_PAGE_SIZE },
  hint: `Records per page. Deputy's default is 100 and its server caps the response at ` +
    `${MAX_PAGE_SIZE}; asking for more is silently capped, so this action asks for at most that.`,
};

export const CURSOR_PARAM: Param = {
  key: "cursor",
  label: "Cursor (offset)",
  type: "number",
  advanced: true,
  validation: { integer: true, min: 0 },
  hint: "Where this page starts, 0-indexed. Read it back from the previous call's `nextCursor` — " +
    "absent means the table ended. Deputy's QUERY takes a plain offset, not an opaque cursor.",
};

/** Every QUERY action's params, in the order the editor should show them. */
export const QUERY_PARAMS: Param[] = [
  SEARCH_PARAM,
  SORT_PARAM,
  JOIN_PARAM,
  MAX_PARAM,
  CURSOR_PARAM,
];

/** Turn the action's form values into the documented QUERY body. */
export function buildQueryBody(input: QueryInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const search = asOptionalJson<Record<string, unknown>>(input.search, "Filter");
  const sort = asOptionalJson<Record<string, unknown>>(input.sort, "Sort");
  const join = csv(input.join);

  if (search) body.search = search;
  if (sort) body.sort = sort;
  if (join) body.join = join;

  const start = Number(input.cursor ?? 0);
  body.start = Number.isFinite(start) && start > 0 ? Math.floor(start) : 0;
  body.max = pageSize(input.max);
  return body;
}

/** Clamp a requested page size into Deputy's documented 1..500 range. */
export function pageSize(raw: unknown): number {
  const n = Number(raw ?? 100);
  if (!Number.isFinite(n)) return 100;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(n)));
}

/**
 * Fold a QUERY response into the platform's `{ items, nextCursor }` shape.
 *
 * The offset is the cursor: a page that came back exactly full may have a
 * successor, so `start + max` is offered back. A short page is the end of the
 * table, which is Deputy's own behaviour — the endpoint has no total count to
 * compare against.
 */
export function searchPage<T>(items: T[], input: QueryInput): SearchPage<T> {
  const start = Number(input.cursor ?? 0);
  const offset = Number.isFinite(start) && start > 0 ? Math.floor(start) : 0;
  const max = pageSize(input.max);
  const page: SearchPage<T> = { items, count: items.length, start: offset, max };
  if (items.length >= max) page.nextCursor = offset + items.length;
  return page;
}
