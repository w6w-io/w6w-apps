import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the Chatwork actions.
 *
 * Every enum here is copied from Chatwork's OpenAPI 3.1 document (fetched
 * 2026-08-29 from `developer.chatwork.com`'s embedded reference schema), not
 * inferred.
 */

export const roomIdParam: Param = {
  key: "roomId",
  label: "Room ID",
  type: "string",
  required: true,
  hint: "The chat's room_id — from a Room List/Get action, or the URL of the chat in Chatwork.",
};

export const messageIdParam: Param = {
  key: "messageId",
  label: "Message ID",
  type: "string",
  required: true,
};

export const taskIdParam: Param = {
  key: "taskId",
  label: "Task ID",
  type: "number",
  required: true,
};

export const fileIdParam: Param = {
  key: "fileId",
  label: "File ID",
  type: "number",
  required: true,
};

export const requestIdParam: Param = {
  key: "requestId",
  label: "Contact Request ID",
  type: "number",
  required: true,
};

/** `task_status`: `open` | `done`. */
export const taskStatusOptions = [
  { value: "open", label: "Open — not yet completed" },
  { value: "done", label: "Done — completed" },
];

/** `task_limit_type`: how a task's deadline is expressed. */
export const taskLimitTypeOptions = [
  { value: "none", label: "No deadline" },
  { value: "date", label: "Date" },
  { value: "time", label: "Date and time" },
];

/** `room_role`: a member's permission level within a chat. */
export const roomRoleOptions = [
  { value: "admin", label: "Administrator" },
  { value: "member", label: "Member" },
  { value: "readonly", label: "Read-only" },
];

/** `room_icon_preset`: the fixed set of built-in chat icons. */
export const roomIconPresetOptions = [
  "group",
  "check",
  "document",
  "meeting",
  "event",
  "project",
  "business",
  "study",
  "security",
  "star",
  "idea",
  "heart",
  "magcup",
  "beer",
  "music",
  "sports",
  "travel",
].map((v) => ({ value: v, label: v }));

/** Delete-room `action_type`: leave the group, or delete it outright (admin only). */
export const roomActionTypeOptions = [
  { value: "leave", label: "Leave — remove yourself from the chat" },
  { value: "delete", label: "Delete — permanently delete the chat (admin only)" },
];

/**
 * `account_ids` — a comma-separated list of account IDs, as Chatwork's
 * `members_admin_ids` / `to_ids` / etc. all expect on the wire.
 */
export function accountIdsParam(key: string, label: string, hint: string, required = false): Param {
  return { key, label, type: "string", required, hint };
}

/** Normalise a `multiselect`/CSV-typed account-id list param into the wire form. */
export function toCsv(v: string[] | string | number[] | undefined | null): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = Array.isArray(v) ? v.map(String) : String(v).split(",");
  const cleaned = items.map((s) => s.trim()).filter(Boolean);
  return cleaned.length ? cleaned.join(",") : undefined;
}
