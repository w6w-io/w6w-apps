import type { OutputField, Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the ServiceM8 actions. Every option list here is
 * copied from ServiceM8's own OpenAPI document or prose guides (fetched
 * 2026-08-24), not inferred.
 */

/**
 * `cursor` — every list endpoint's pagination parameter (`pagination.md`).
 * `-1` starts a new read; any other value is a `x-next-cursor` value returned
 * by a previous call. Leaving it blank also starts from the beginning.
 */
export const cursorParam: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  hint: 'Set to "-1" to start from the first page, or paste a previous call\'s `nextCursor` to ' +
    "continue. Each page holds up to 1,000 records; leave blank to also start from the beginning.",
};

/**
 * `$filter` — documented on every list operation in the reference
 * (`filtering.md`). Up to 10 conditions joined with a literal `and`; no `or`,
 * no `not`, no parentheses, and only `eq`/`ne`/`gt`/`lt` (no `ge`/`le`).
 */
export const filterParam: Param = {
  key: "filter",
  label: "Filter ($filter)",
  type: "string",
  hint: "OData-style, e.g. `status eq 'Work Order' and active eq 1`. String values in single " +
    "quotes, numbers bare. Up to 10 conditions joined with `and` only — no `or`, no parentheses, " +
    "and only eq/ne/gt/lt (no ge/le).",
};

/**
 * `$sort` — demonstrated in `filtering.md`'s own worked example
 * (`$sort=due_date desc`) but not listed as a formal parameter on any
 * operation in the OpenAPI document.
 */
export const sortParam: Param = {
  key: "sort",
  label: "Sort ($sort)",
  type: "string",
  hint: "e.g. `due_date desc`. Demonstrated in ServiceM8's own filtering guide; not formally " +
    "declared on any endpoint in the reference, so behaviour outside the documented example is " +
    "unconfirmed.",
};

/** The three list-call params every list action in this app offers. */
export function listParams(): Param[] {
  return [filterParam, sortParam, cursorParam];
}

/** The envelope every list action returns. */
export function listOutput(label: string): OutputField[] {
  return [
    { key: "items", type: "array", label },
    {
      key: "nextCursor",
      type: "string",
      label: "Next page cursor (x-next-cursor)",
    },
  ];
}

/** `Job.status` — the enum the reference declares for `JobCreate`/`Job`. */
export const jobStatusOptions = [
  { value: "Quote", label: "Quote" },
  { value: "Work Order", label: "Work Order" },
  { value: "Unsuccessful", label: "Unsuccessful" },
  { value: "Completed", label: "Completed" },
];
