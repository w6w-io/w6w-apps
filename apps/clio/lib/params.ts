import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Clio actions.
 *
 * Every field name, enum and default here is read from Clio's own OpenAPI 3.1
 * document (fetched 2026-08-24 from `docs.developers.clio.com/openapi.json`),
 * not inferred from a sibling app.
 */

/**
 * The `fields` query/body parameter every Clio endpoint accepts.
 *
 * **Deliberately never left blank.** Per Clio's own Fields guide, omitting
 * `fields` returns only `id` and `etag` on most endpoints — the opposite
 * footgun from a vendor whose list defaults are huge, but just as costly: a
 * first integration that reads the documented response shape and calls the
 * endpoint without `fields` gets back almost nothing and assumes the API is
 * broken. Every action here prefills a sensible field list instead.
 */
export function fieldsParam(defaultFields: string, extra?: string): Param {
  return {
    key: "fields",
    label: "Fields",
    type: "string",
    default: defaultFields,
    hint: "Comma-separated list of fields to return. Clio's own default, if this is left empty, " +
      "is `id,etag` only — almost nothing. Nested resources can be expanded with " +
      "`field{subfield,subfield}`, one level deep." + (extra ? ` ${extra}` : ""),
  };
}

/**
 * `limit` + `page_token` — cursor pagination, Clio's default and the only
 * approach with no total-record ceiling (offset pagination caps at 10,000).
 * `order=id(asc)` is required for cursor pagination and is applied by each
 * action's own request, not exposed as a param, since offset-based custom
 * sorting is out of scope for v1 (see the README).
 */
export function paginationParams(defaultLimit = 50): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: { integer: true, min: 1, max: 200 },
      hint: "Up to 200 per page (Clio's own ceiling for index actions).",
    },
    {
      key: "pageToken",
      label: "Page token",
      type: "string",
      hint: "The `nextPageToken` from a previous call to this action. Leave empty for the first " +
        "page.",
    },
  ];
}

/** A required numeric id path/body parameter, e.g. a Matter id. */
export function idParam(label: string, hint?: string): Param {
  return { key: "id", label, type: "number", required: true, validation: { integer: true }, hint };
}

/** A required numeric reference to another resource, e.g. `clientId` -> `{client: {id}}`. */
export function refParam(key: string, label: string, hint?: string): Param {
  return {
    key,
    label,
    type: "number",
    validation: { integer: true },
    hint,
  };
}

export const createdSinceParam: Param = {
  key: "createdSince",
  label: "Created since",
  type: "datetime",
  hint: "ISO-8601 timestamp. Only records created after this time.",
};

export const updatedSinceParam: Param = {
  key: "updatedSince",
  label: "Updated since",
  type: "datetime",
  hint: "ISO-8601 timestamp. Only records updated after this time.",
};

export const queryParam: Param = {
  key: "query",
  label: "Search",
  type: "string",
  hint: "Wildcard search across the fields this endpoint documents.",
};

export const matterIdFilterParam: Param = refParam(
  "matterId",
  "Matter ID",
  "Leave empty to match every Matter.",
);

export const matterStatusOptions = [
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "closed", label: "Closed" },
];

export const contactTypeOptions = [
  { value: "Person", label: "Person" },
  { value: "Company", label: "Company" },
];

export const taskStatusOptions = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "in_review", label: "In review" },
  { value: "complete", label: "Complete" },
  { value: "draft", label: "Draft" },
];

export const taskPriorityOptions = [
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
];

export const activityTypeOptions = [
  { value: "TimeEntry", label: "Time entry" },
  { value: "ExpenseEntry", label: "Expense entry" },
  { value: "HardCostEntry", label: "Hard cost entry" },
  { value: "SoftCostEntry", label: "Soft cost entry" },
];

export const activityStatusOptions = [
  { value: "billed", label: "Billed" },
  { value: "draft", label: "Draft" },
  { value: "unbilled", label: "Unbilled" },
  { value: "non_billable", label: "Non-billable" },
  { value: "billable", label: "Billable" },
  { value: "written_off", label: "Written off" },
];

export const noteTypeOptions = [
  { value: "Matter", label: "Matter note" },
  { value: "Contact", label: "Contact note" },
];
