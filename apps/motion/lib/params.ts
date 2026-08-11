import type { Option, Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the Motion actions.
 *
 * Every enum here is transcribed from Motion's own reference pages (fetched
 * 2026-08-11), not inferred. Where two endpoints document *different* sets for
 * the same-looking field — and two of them do — the difference is preserved
 * rather than averaged into one wrong list.
 *
 * ## Query arrays are deliberately not exposed
 *
 * Two documented query parameters are typed `array<string>`:
 * `status` on `GET /v1/tasks` and `ids` on `GET /v1/workspaces`. Neither is
 * offered by this app, and that is a decision rather than an oversight.
 *
 * Motion's reference contains **no example request anywhere** — no curl block,
 * no code sample, no OpenAPI document (`/openapi.json` returns the site's 200-OK
 * shell) — so the wire encoding of a query array is unspecified. The two
 * plausible forms behave very differently on a NestJS/Express stack:
 * `?status=A&status=B` parses to `["A","B"]` but `?status=A` parses to the
 * *string* `"A"`, while `?status=A,B` parses to the single string `"A,B"`.
 * Guessing wrong does not raise an error, it silently returns the wrong set of
 * tasks — which is worse than not offering the filter. `includeAllStatuses` (a
 * plain boolean, and documented as mutually exclusive with `status` anyway) is
 * offered instead, and a workflow can filter the returned page on
 * `status.name`.
 *
 * Body arrays are unaffected: `labels` and `stages` travel inside a JSON body,
 * where an array has exactly one encoding.
 */

/** `TaskPriority` — the four values `POST/PATCH /v1/tasks` and `POST /v1/projects` accept. */
export const priorityOptions: Option[] = [
  { value: "ASAP", label: "ASAP" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

/**
 * Priority on a **recurring** task, which is not the same list.
 *
 * `POST /v1/recurring-tasks` documents only `"HIGH"` or `"MEDIUM"` — no `ASAP`,
 * no `LOW`. Reusing {@link priorityOptions} here would offer two values the
 * endpoint rejects.
 */
export const recurringPriorityOptions: Option[] = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium (default)" },
];

/** `deadlineType` on a task: three values. */
export const deadlineTypeOptions: Option[] = [
  { value: "HARD", label: "Hard — must be done by the due date" },
  { value: "SOFT", label: "Soft (default)" },
  { value: "NONE", label: "None" },
];

/**
 * `deadlineType` on a **recurring** task: two values.
 *
 * `POST /v1/recurring-tasks` documents `"HARD"` or `"SOFT"` only — `NONE` is
 * absent, unlike on a one-off task.
 */
export const recurringDeadlineTypeOptions: Option[] = [
  { value: "HARD", label: "Hard" },
  { value: "SOFT", label: "Soft (default)" },
];

/**
 * The twelve custom-field types, verbatim from
 * `GET/POST /beta/workspaces/{workspaceId}/custom-fields`.
 *
 * Note the casing: `multiPerson`, `multiSelect` and `relatedTo` are camelCase
 * while the rest are lowercase words. They are sent verbatim.
 */
export const customFieldTypeOptions: Option[] = [
  { value: "text", label: "Text" },
  { value: "url", label: "URL" },
  { value: "date", label: "Date" },
  { value: "person", label: "Person" },
  { value: "multiPerson", label: "Multi-person" },
  { value: "phone", label: "Phone" },
  { value: "select", label: "Select" },
  { value: "multiSelect", label: "Multi-select" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "checkbox", label: "Checkbox" },
  { value: "relatedTo", label: "Related to (another task)" },
];

/**
 * The one paging control Motion offers.
 *
 * There is no page-size parameter anywhere in the reference — the server picks,
 * and reports what it picked as `meta.pageSize`. Paging is: run the query, take
 * `meta.nextCursor` off the result, resend the *identical* query with this set.
 */
export const cursorParam: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  hint: "Take it from `meta.nextCursor` of a previous result to fetch the next page. Motion " +
    "chooses the page size itself and reports it as `meta.pageSize`; there is no limit " +
    "parameter. An absent `nextCursor` means you have reached the end.",
};

export function workspaceIdParam(required: boolean, hint?: string): Param {
  return {
    key: "workspaceId",
    label: "Workspace",
    type: "string",
    required,
    hint: hint ?? "From the `id` of a List Workspaces result.",
  };
}

export const taskIdParam: Param = {
  key: "id",
  label: "Task ID",
  type: "string",
  required: true,
  hint: "From the `id` of a List Tasks or Create Task result.",
};

export const projectIdParam: Param = {
  key: "id",
  label: "Project ID",
  type: "string",
  required: true,
  hint: "From the `id` of a List Projects or Create Project result.",
};

export const assigneeIdParam: Param = {
  key: "assigneeId",
  label: "Assignee",
  type: "string",
  hint: "User id, from List Users or Get My User. Not an email address.",
};

/**
 * `duration` — `"NONE"`, `"REMINDER"`, or a positive integer of minutes.
 *
 * Exposed as free text because the field is genuinely a union of two enum
 * members and an integer, and a `select` cannot carry the integer arm. See
 * {@link parseDuration} for the conversion.
 */
export const durationParam: Param = {
  key: "duration",
  label: "Duration",
  type: "string",
  placeholder: "30",
  hint: 'Minutes as a whole number greater than 0, or the words "NONE" or "REMINDER". ' +
    "Motion documents this field as `string | number`.",
};

/**
 * Send a duration the way the field is typed: a number when it is minutes, the
 * word when it is one of the two enum members.
 *
 * `"30"` and `30` both become the number `30`. `"REMINDER"` stays a string.
 * Anything else is passed through untouched so Motion's own validation — not a
 * guess made here — decides whether it is acceptable.
 */
export function parseDuration(value: unknown): string | number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return value;
  const text = String(value).trim();
  if (text === "") return undefined;
  return /^\d+$/.test(text) ? Number(text) : text;
}

/**
 * `autoScheduled` — the object that turns Motion's scheduling engine on for a
 * task, and the `null` that turns it off.
 *
 * Free-form JSON rather than a `group` for one reason: a group can express the
 * object but cannot express `null`, and `null` is the *only* way to disable
 * auto-scheduling on an existing task. The documented children are
 * `startDate` (ISO 8601, trimmed to the start of the day), `deadlineType`
 * (`HARD` | `SOFT` | `NONE`, default `SOFT`) and `schedule` (default
 * `"Work Hours"`).
 */
export const autoScheduledParam: Param = {
  key: "autoScheduled",
  label: "Auto-schedule",
  type: "json",
  placeholder: '{"startDate": "2026-08-12T00:00:00.000Z", "schedule": "Work Hours"}',
  hint: 'An object turns auto-scheduling ON: {"startDate": ISO 8601, "deadlineType": ' +
    '"HARD"|"SOFT"|"NONE", "schedule": name}. The literal `null` turns it OFF. Leave empty to ' +
    "not touch it. The task's status must have auto-scheduling enabled, and `schedule` MUST be " +
    '"Work Hours" when scheduling for another user.',
};

/** `labels` — names, not ids, on both tasks and projects. */
export const labelsParam: Param = {
  key: "labels",
  label: "Labels",
  type: "array",
  item: { type: "string", placeholder: "Marketing" },
  hint: "Label NAMES, not ids. A workspace's labels are the `labels` array of a List Workspaces " +
    "result.",
};

/** The paging envelope, declared identically by every list action. */
export const pageOutput = [
  { key: "meta.nextCursor", type: "string" as const, label: "Cursor for the next page" },
  { key: "meta.pageSize", type: "number" as const, label: "Results in this page" },
];
