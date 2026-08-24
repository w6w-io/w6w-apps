import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the Browse AI actions.
 *
 * Every enum and field here is copied from Browse AI's OpenAPI 3.1 document
 * (fetched 2026-08-24 from `docs.browse.ai/api/`), not inferred.
 */

export const robotIdParam: Param = {
  key: "robotId",
  label: "Robot",
  type: "string",
  required: true,
  placeholder: "c3689adb-50aa-44af-b265-a7e0d4e5846e",
  hint: "Open the robot on dashboard.browse.ai and copy its ID from the browser address bar.",
};

export const taskIdParam: Param = {
  key: "taskId",
  label: "Task",
  type: "string",
  required: true,
  placeholder: "f3672790-4561-424b-8a7b-7b7df182b236",
  hint: "Take it from the `id` field of a Run Robot response, or from Get Tasks.",
};

export const monitorIdParam: Param = {
  key: "monitorId",
  label: "Monitor",
  type: "string",
  required: true,
  placeholder: "e524ab69-4269-4d9d-b3d8-678112a10d29",
  hint: "Open the monitor on the robot's dashboard page and copy its ID from the address bar.",
};

export const bulkRunIdParam: Param = {
  key: "bulkRunId",
  label: "Bulk run",
  type: "string",
  required: true,
  placeholder: "5aa4df52-25bb-48da-bf38-ce4f2bd98dd5",
  hint: "Take it from the `id` field of a Bulk Run Tasks response.",
};

export const webhookIdParam: Param = {
  key: "webhookId",
  label: "Webhook",
  type: "string",
  required: true,
  placeholder: "6d7f1218-43fb-4735-ac71-21e81b1ab23e",
};

/**
 * `InputParameters` — an object of `{name: string|number|string[]}` pairs that
 * override a robot's own default input parameter values (its origin URL, any
 * limit/skip pair, etc). The set of names is defined by the robot itself (see
 * `Robot.inputParameters` from `robot-get`), not by this app, so it is a
 * free-form `json` param rather than a generated form.
 */
export const inputParametersParam: Param = {
  key: "inputParameters",
  label: "Input parameters",
  type: "json",
  hint: "An object overriding the robot's default input parameter values, e.g. " +
    '`{"originUrl": "https://example.com", "limit": 10}`. Parameter names are specific to each ' +
    "robot — read them from Get Robot's `inputParameters`. Leave empty to use the robot's own " +
    "defaults.",
};

/** `RobotTask.status` / the `status` filter on Get Tasks. */
export const taskStatusOptions = [
  { value: "in-progress", label: "In progress" },
  { value: "successful", label: "Successful" },
  { value: "failed", label: "Failed" },
];

/** `Webhook.webhookEvent` / `CreateNewWebhookBodyParams.eventType`. */
export const webhookEventTypeOptions = [
  { value: "taskFinished", label: "Task finished (successfully or with error)" },
  { value: "taskFinishedSuccessfully", label: "Task finished successfully" },
  { value: "taskFinishedWithError", label: "Task finished with error" },
  { value: "taskCapturedDataChanged", label: "Task captured data changed (monitors)" },
  { value: "tableExportFinishedSuccessfully", label: "Table export finished (Beta)" },
];

/** `Monitor.status` / the `status` field on Update Monitor. */
export const monitorStatusOptions = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
];

/**
 * The `page` param shared by Get Tasks, Get Bulk Runs and Get Bulk Run. Browse
 * AI's own minimum is 1; there is no documented maximum.
 */
export const pageParam: Param = {
  key: "page",
  label: "Page",
  type: "number",
  default: 1,
  validation: { integer: true, min: 1 },
  hint: "1-based page number.",
};

/**
 * Get Tasks' own page size, capped by the vendor at 10 — the tightest list
 * ceiling in this API and easy to miss if you assume the usual 100.
 */
export const pageSizeParam: Param = {
  key: "pageSize",
  label: "Page size",
  type: "number",
  default: 10,
  validation: { integer: true, min: 1, max: 10 },
  hint: "Browse AI caps this endpoint at 10 tasks per page — there is no way to ask for more.",
};
