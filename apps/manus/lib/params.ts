import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the Manus actions.
 *
 * Every enum here is copied verbatim from Manus's own OpenAPI document
 * (`open.manus.ai/docs/v2/openapi_v2.json`, fetched 2026-09-05), not inferred
 * or guessed at.
 */

/** `share_visibility` — who can view a task. */
export const shareVisibilityOptions = [
  { value: "private", label: "Private — only the task creator" },
  { value: "team", label: "Team — all team members" },
  { value: "public", label: "Public — anyone with the share URL, no auth required" },
];

/**
 * `agent_profile` — the stable values Manus documents for requests.
 * Versioned aliases (`1.6-lite`, `manus-1.6-max`, …) are also accepted on the
 * wire but are not modeled here: the version segment is ignored server-side
 * because model versions are not selected independently.
 */
export const agentProfileOptions = [
  { value: "standard", label: "Standard (default)" },
  { value: "lite", label: "Lite — faster, lower cost" },
  { value: "max", label: "Max — highest capability" },
];

/** `scope` on `task.list` — which task type to filter by. */
export const taskScopeOptions = [
  { value: "all", label: "All (default)" },
  { value: "standard", label: "Standard — regular tasks" },
  { value: "project", label: "Project — tasks within a project (requires Project ID)" },
  { value: "agent_subtask", label: "Agent subtask — an agent's subtasks (requires Agent ID)" },
];

/** Sort direction shared by every list endpoint that orders by time. */
export const orderOptions = [
  { value: "desc", label: "Newest first (default)" },
  { value: "asc", label: "Oldest first" },
];

/** `visibility` a published site may take — narrower than a task's, no `private` option. */
export const publishVisibilityOptions = [
  { value: "public", label: "Public — anyone (default)" },
  { value: "team", label: "Team — current team members only (team accounts)" },
];

export const taskIdParam: Param = {
  key: "taskId",
  label: "Task ID",
  type: "string",
  required: true,
  hint: "The task's id, or the shortcut `agent-default-main_task` for the IM agent's main task.",
};

/** The `cursor`/`limit` pair every Manus cursor-paginated list endpoint takes. */
export function cursorParams(defaultLimit: number, maxLimit: number): Param[] {
  return [
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "Pass the previous page's `nextCursor` to continue. Leave empty for the first page.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: { integer: true, min: 1, max: maxLimit },
      hint: `Manus's own default is ${defaultLimit}, maximum ${maxLimit}.`,
    },
  ];
}

/** The single-file-attachment fields shared by `task-create` and `task-send-message`. */
export const attachmentParams: Param[] = [
  {
    key: "fileId",
    label: "Attach file (by ID)",
    type: "string",
    advanced: true,
    hint: "ID of a file uploaded via File Upload. Mutually exclusive with File URL below.",
  },
  {
    key: "fileUrl",
    label: "Attach file (by URL)",
    type: "string",
    advanced: true,
    hint: "A publicly accessible URL Manus will download directly. Mutually exclusive with " +
      "Attach file (by ID).",
  },
  {
    key: "fileName",
    label: "File name",
    type: "string",
    advanced: true,
    hint: "Display name including extension. Recommended when attaching by URL.",
  },
];
