import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Hubstaff actions.
 *
 * Every label, type, enum and default here mirrors the parameter list in
 * Hubstaff's OpenAPI document at <https://api.hubstaff.com/v2/docs> (fetched
 * 2026-09-22). Where the vendor's prose adds a constraint the document omits,
 * the note says which source it came from.
 */

/** The organization that owns nearly every sub-resource in this app. */
export const organizationIdParam: Param = {
  key: "organization_id",
  label: "Organization ID",
  type: "number",
  required: true,
  validation: { integer: true },
  hint: "From List Organizations, e.g. 123456. `GET /v2/organizations` returns the " +
    "organizations the token's member is an active member of.",
};

/** The project a task or activity hangs off. */
export const projectIdParam: Param = {
  key: "project_id",
  label: "Project ID",
  type: "number",
  required: true,
  validation: { integer: true },
  hint: "From List Projects, e.g. 841201.",
};

/** The member whose time entries or profile to read. */
export const userIdParam: Param = {
  key: "user_id",
  label: "User ID",
  type: "number",
  required: true,
  validation: { integer: true },
  hint: "From List Members or Get Current User, e.g. 651956.",
};

export const taskIdParam: Param = {
  key: "task_id",
  label: "Task ID",
  type: "number",
  required: true,
  validation: { integer: true },
  hint: "From List Tasks, e.g. 11223344.",
};

export const timesheetIdParam: Param = {
  key: "timesheet_id",
  label: "Timesheet ID",
  type: "number",
  required: true,
  validation: { integer: true },
  hint: "From List Timesheets.",
};

export const teamIdParam: Param = {
  key: "team_id",
  label: "Team ID",
  type: "number",
  required: true,
  validation: { integer: true },
  hint: "From List Teams.",
};

export const clientIdParam: Param = {
  key: "client_id",
  label: "Client ID",
  type: "number",
  required: true,
  validation: { integer: true },
  hint: "From List Clients.",
};

/**
 * The cursor pair every Hubstaff list endpoint shares.
 *
 * `page_start_id` is deliberately left **unset** rather than defaulted to the
 * document's `0`: omitting it is the first page, and writing `page_start_id=0`
 * on every request would hide the moment a workflow forgets to carry the cursor
 * forward. `page_limit` is prefilled with the vendor's own default.
 *
 * One page per call, never an auto-follow loop: a workflow step loops on
 * `pagination.next_page_start_id` itself, so a run cannot block on an
 * unbounded fetch-everything sweep.
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "page_start_id",
      label: "Page start ID (cursor)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "`pagination.next_page_start_id` from the previous response. Omit it for the " +
        "first page — the vendor documents an unset cursor as 0.",
      advanced: true,
    },
    {
      key: "page_limit",
      label: "Page size",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1, max: 500 },
      hint: "Items per page. Hubstaff's default is 100 and its maximum is 500.",
      advanced: true,
    },
  ];
}

/**
 * A multi-valued filter, surfaced as one comma-separated text field.
 *
 * Hubstaff's `type: "array"` query parameters carry no `collectionFormat` in
 * the document, so Swagger 2.0's `csv` default applies and the value goes on
 * the wire as `?status=active,archived`.
 */
export function csvParam(key: string, label: string, hint: string, values?: string[]): Param {
  return {
    key,
    label,
    type: "string",
    placeholder: values?.join(","),
    hint: values
      ? `${hint} Comma-separated. One of: ${values.join(", ")}.`
      : `${hint} Comma-separated.`,
    advanced: true,
  };
}
