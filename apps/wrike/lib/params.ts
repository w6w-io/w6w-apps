import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the Wrike actions.
 *
 * Every enum here is copied from Wrike's own OpenAPI 3.0.1 documents (fetched
 * 2026-08-29 from `developers.wrike.com/reference/<operationId>`), not
 * inferred.
 */

export const taskIdParam: Param = {
  key: "taskId",
  label: "Task",
  type: "string",
  required: true,
  placeholder: "IEAGIITRJUAJ25LC",
  hint: "Wrike task ID, e.g. from a task URL's permalink or a previous action's `id` output.",
};

export const folderIdParam: Param = {
  key: "folderId",
  label: "Folder or project",
  type: "string",
  required: true,
  hint:
    "Wrike folder/project ID. Use the account's virtual root folder ID (from Query Accounts) to " +
    "create at the account root.",
};

export const contactIdParam: Param = {
  key: "contactId",
  label: "Contact",
  type: "string",
  required: true,
  hint: "Wrike contact (user or group) ID.",
};

export const commentIdParam: Param = {
  key: "commentId",
  label: "Comment",
  type: "string",
  required: true,
};

export const timelogIdParam: Param = {
  key: "timelogId",
  label: "Timelog",
  type: "string",
  required: true,
};

export const attachmentIdParam: Param = {
  key: "attachmentId",
  label: "Attachment",
  type: "string",
  required: true,
};

/** `TaskStatus`. */
export const taskStatusOptions = [
  { value: "Active", label: "Active" },
  { value: "Deferred", label: "Deferred" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

/** `TaskImportance`. */
export const taskImportanceOptions = [
  { value: "High", label: "High" },
  { value: "Normal", label: "Normal" },
  { value: "Low", label: "Low" },
];

/** `BillingType`, shared by tasks and timelogs. */
export const billingTypeOptions = [
  { value: "Billable", label: "Billable" },
  { value: "NonBillable", label: "Non-Billable" },
];

/** `SortOrder`. */
export const sortOrderOptions = [
  { value: "Asc", label: "Ascending" },
  { value: "Desc", label: "Descending" },
];

/** `TaskSortField`, for Get Tasks. */
export const taskSortFieldOptions = [
  { value: "Status", label: "Status" },
  { value: "Importance", label: "Importance" },
  { value: "UpdatedDate", label: "Updated date" },
  { value: "CreatedDate", label: "Created date" },
  { value: "Title", label: "Title (lexicographic)" },
  { value: "StartFinishInterval", label: "Start–finish interval" },
  { value: "DueDate", label: "Due date" },
  { value: "LastAccessDate", label: "Last access date" },
  { value: "CompletedDate", label: "Completed date" },
];

/** `ContactType` — Wrike's umbrella term for both people and groups. */
export const contactTypeOptions = [
  { value: "Person", label: "Person" },
  { value: "Group", label: "Group — usable in sharing, nowhere else" },
  { value: "Asset", label: "Asset (equipment)" },
  { value: "Robot", label: "Robot — automated integration user" },
];

/**
 * The `pageSize` / `nextPageToken` cursor pair documented on the account-scope
 * list endpoints (Get Tasks, Get Folders, Get Timelogs for a task).
 *
 * Wrike's own parameter description says the response "will return a token
 * that applies an offset to the next page" but — across every endpoint's
 * published OpenAPI document — never names where that token comes back. It is
 * not in the documented JSON envelope (`{kind, data}`), so it must be a
 * response header; {@link import("./client.ts").WrikeClient} does not expose
 * headers today; see `actions/task-list.ts` for how the token is recovered
 * without hard-coding an unconfirmed header name.
 */
export function paginationParams(defaultPageSize: number): Param[] {
  return [
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: defaultPageSize,
      validation: { integer: true, min: 1, max: 1000 },
      hint: "Max 1000 per Wrike's own documentation.",
    },
    {
      key: "nextPageToken",
      label: "Next page token",
      type: "string",
      advanced: true,
      hint: "Pass the token this action returned in `nextPageToken` to fetch the next page.",
    },
  ];
}

/**
 * The catch-all passthrough for the parts of Wrike's create/update surface not
 * modeled as their own fields — e.g. `effortAllocation`, `workScheduleId`,
 * `cascadingFieldSettings`, `setResponsibleAllocation`. Modeling Wrike's full,
 * heavily cross-referenced parameter set per endpoint is not worth the
 * maintenance cost when the vendor's own query-string convention (see
 * `lib/client.ts`) means any of these round-trips through this field exactly
 * as Wrike's docs specify it, JSON-encoded.
 *
 * Merged last, so a key here can override one of the named fields above it —
 * useful for reaching a brand-new API field before this app is updated to
 * name it directly.
 */
export const rawParamsParam: Param = {
  key: "rawParams",
  label: "Additional parameters (advanced)",
  type: "json",
  advanced: true,
  hint: "Extra query parameters this action does not model directly, as a JSON object — " +
    'e.g. {"effortAllocation":{"mode":"Basic","totalEffort":120}}. See the endpoint\'s page under ' +
    "developers.wrike.com/reference for the full parameter list. Overrides the named fields above " +
    "on key collision.",
};
