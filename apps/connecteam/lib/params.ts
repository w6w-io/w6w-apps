import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Connecteam actions.
 *
 * Every enum here is copied from Connecteam's own OpenAPI 3.1 document
 * (fetched 2026-08-29 from `developer.connecteam.com`'s published
 * `openapi/connecteam-api-documentation.json`), not inferred or borrowed from
 * a sibling app.
 */

/** `UserType` — 'user' by default; promoting to admin is a separate endpoint. */
export const userTypeOptions = [
  { value: "user", label: "User" },
  { value: "manager", label: "Manager" },
  { value: "owner", label: "Owner" },
];

/** `UserStatus` filter on the users list. */
export const userStatusOptions = [
  { value: "active", label: "Active (default)" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

/** `SortOrder`, shared by every sortable list endpoint. */
export const sortOrderOptions = [
  { value: "asc", label: "Ascending (default)" },
  { value: "desc", label: "Descending" },
];

/** `TaskStatus` on create/update — no 'all' here, unlike the list filter below. */
export const taskStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "completed", label: "Completed" },
];

/** `TaskStatusFilter` on the tasks list — adds 'all'. */
export const taskStatusFilterOptions = [
  { value: "all", label: "All (default)" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "completed", label: "Completed" },
];

/**
 * The offset/limit pair every list endpoint in this app's surface uses.
 *
 * Vendor defaults are already modest — `limit` defaults to 10 everywhere —
 * unlike the pack's usual "vendor default is the maximum" footgun, so this
 * only documents the endpoint's own ceiling rather than overriding the
 * default. Passing the real ceiling matters: it varies per endpoint (100,
 * 300 or 500) and is enforced server-side.
 */
export function paginationParams(maxLimit: number): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 10,
      validation: { integer: true, min: 1, max: maxLimit },
      hint:
        `Results per page. Connecteam's own default and this endpoint's ceiling is ${maxLimit}.`,
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      validation: { integer: true, min: 0 },
      hint: "Number of records to skip from the start of the result set.",
    },
  ];
}

export const userIdParam: Param = {
  key: "userId",
  label: "User ID",
  type: "number",
  required: true,
  hint: "The user's numeric id, e.g. from a user-list result.",
};

export const userIdsParam: Param = {
  key: "userIds",
  label: "User IDs",
  type: "string",
  hint: "Comma-separated list of user ids to filter by.",
};

export const timeClockIdParam: Param = {
  key: "timeClockId",
  label: "Time Clock",
  type: "number",
  required: true,
  hint: "The time clock's numeric id, from time-clock-list.",
};

export const schedulerIdParam: Param = {
  key: "schedulerId",
  label: "Schedule",
  type: "number",
  required: true,
  hint: "The schedule's numeric id, from scheduler-list.",
};

export const shiftIdParam: Param = {
  key: "shiftId",
  label: "Shift ID",
  type: "string",
  required: true,
};

export const jobIdParam: Param = {
  key: "jobId",
  label: "Job",
  type: "string",
  hint: "The id of the job or sub-job this applies to, from job-list.",
};

export const formIdParam: Param = {
  key: "formId",
  label: "Form ID",
  type: "number",
  required: true,
  hint: "The form's numeric id, from form-list.",
};

export const taskBoardIdParam: Param = {
  key: "taskBoardId",
  label: "Task Board",
  type: "string",
  required: true,
  hint: "The task board's id, from taskboard-list.",
};

export const taskIdParam: Param = {
  key: "taskId",
  label: "Task ID",
  type: "string",
  required: true,
};

/**
 * ISO 8601 `YYYY-MM-DD` date-range pair, shared by the endpoints that filter
 * by calendar date rather than by Unix timestamp (forms, time-off,
 * timesheet). Kept as `type: "string"` rather than `"date"` because several of
 * these endpoints also accept it as the start of a half-open range with no
 * time component, and a `date` param's own format is host-rendered as a full
 * date-time picker in some hosts.
 */
export function dateRangeParams(
  startRequired: boolean,
  hint: { start: string; end: string },
): Param[] {
  return [
    {
      key: "startDate",
      label: "Start date",
      type: "string",
      required: startRequired,
      placeholder: "2026-01-01",
      hint: hint.start,
    },
    {
      key: "endDate",
      label: "End date",
      type: "string",
      required: startRequired,
      placeholder: "2026-01-31",
      hint: hint.end,
    },
  ];
}
