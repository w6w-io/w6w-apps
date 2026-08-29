import type { Param } from "@w6w/types";
import { compact, toIdList } from "./client.ts";

/**
 * Shared param fragments for the conversation-management attributes that
 * `PATCH /v1/conversations`, `POST /v1/drafts`, `POST /v1/messages` and
 * `POST /v1/posts` all document identically (verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints`, 2026-08-29). Missive's
 * own docs describe each field's semantics once and reuse it across all four
 * endpoints; these Param objects do the same rather than re-deriving four
 * slightly different copies.
 */

export const ORGANIZATION_PARAM: Param = {
  key: "organization",
  label: "Organization ID",
  type: "string",
  default: "",
  hint: "Required when using Add Users, Add Assignees, Remove Assignees, or Add Shared Labels. " +
    "Scopes conversation lookup by reference/subject to this organization.",
  advanced: true,
};

export const TEAM_PARAM: Param = {
  key: "team",
  label: "Team ID",
  type: "string",
  default: "",
  hint: "Links the conversation to a team. Ignored if the conversation is already in a team " +
    "(see Force Team).",
  advanced: true,
};

export const FORCE_TEAM_PARAM: Param = {
  key: "forceTeam",
  label: "Force Team",
  type: "boolean",
  default: false,
  hint: "Change the conversation's team even if it is already linked to a different one.",
  advanced: true,
};

export const ADD_USERS_PARAM: Param = {
  key: "addUsers",
  label: "Add Users (comma-separated IDs)",
  type: "string",
  default: "",
  hint: "User IDs to grant access to the conversation. Requires Organization ID.",
  advanced: true,
};

export const ADD_ASSIGNEES_PARAM: Param = {
  key: "addAssignees",
  label: "Add Assignees (comma-separated IDs)",
  type: "string",
  default: "",
  hint: "User IDs to assign. Existing assignees remain assigned. Requires Organization ID.",
  advanced: true,
};

export const REMOVE_ASSIGNEES_PARAM: Param = {
  key: "removeAssignees",
  label: "Remove Assignees (comma-separated IDs)",
  type: "string",
  default: "",
  hint: "User IDs to unassign. Requires Organization ID.",
  advanced: true,
};

export const ADD_SHARED_LABELS_PARAM: Param = {
  key: "addSharedLabels",
  label: "Add Shared Labels (comma-separated IDs)",
  type: "string",
  default: "",
  advanced: true,
};

export const REMOVE_SHARED_LABELS_PARAM: Param = {
  key: "removeSharedLabels",
  label: "Remove Shared Labels (comma-separated IDs)",
  type: "string",
  default: "",
  advanced: true,
};

export const ADD_TO_INBOX_PARAM: Param = {
  key: "addToInbox",
  label: "Move To Inbox",
  type: "boolean",
  default: false,
  hint: "Moves the conversation to Inbox for everyone with access (unarchives it).",
  advanced: true,
};

export const ADD_TO_TEAM_INBOX_PARAM: Param = {
  key: "addToTeamInbox",
  label: "Move To Team Inbox",
  type: "boolean",
  default: false,
  hint: "Requires Team ID.",
  advanced: true,
};

export const CLOSE_PARAM: Param = {
  key: "close",
  label: "Close Conversation",
  type: "boolean",
  default: false,
  advanced: true,
};

export const CONVERSATION_ID_PARAM: Param = {
  key: "conversation",
  label: "Conversation ID",
  type: "string",
  default: "",
  hint: "Append to this existing conversation instead of starting a new one.",
};

export const REFERENCES_PARAM: Param = {
  key: "references",
  label: "References (comma-separated Message-IDs)",
  type: "string",
  default: "",
  hint: "Append to the conversation containing a message with one of these Message-IDs, " +
    "e.g. from an email's References header. Chevrons around each id are optional. Ignored if " +
    "Conversation ID is set.",
};

export const CONVERSATION_SUBJECT_PARAM: Param = {
  key: "conversationSubject",
  label: "New Conversation Subject",
  type: "string",
  default: "",
  hint: "Subject to use only when a NEW conversation is created (no matching Conversation ID " +
    "or References).",
  advanced: true,
};

export const CONVERSATION_COLOR_PARAM: Param = {
  key: "conversationColor",
  label: "Conversation Color",
  type: "string",
  default: "",
  hint: 'HEX color code, or "good" / "warning" / "danger".',
  advanced: true,
};

/** The subset used by every endpoint that can append to or start a conversation. */
export const CONVERSATION_ROUTING_PARAMS: Param[] = [
  CONVERSATION_ID_PARAM,
  REFERENCES_PARAM,
  CONVERSATION_SUBJECT_PARAM,
  CONVERSATION_COLOR_PARAM,
  ORGANIZATION_PARAM,
  TEAM_PARAM,
  FORCE_TEAM_PARAM,
  ADD_USERS_PARAM,
  ADD_ASSIGNEES_PARAM,
  REMOVE_ASSIGNEES_PARAM,
  ADD_SHARED_LABELS_PARAM,
  REMOVE_SHARED_LABELS_PARAM,
  ADD_TO_INBOX_PARAM,
  ADD_TO_TEAM_INBOX_PARAM,
  CLOSE_PARAM,
];

/** Standard offset pagination, used by every plain list endpoint (max 200, default 50). */
export const OFFSET_LIST_PARAMS: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    hint: "Max results to return. Missive's ceiling: 200.",
  },
  {
    key: "offset",
    label: "Offset",
    type: "number",
    default: 0,
    hint: "Number of results to skip, for paginating.",
  },
];

/** `until`-cursor pagination, used by conversation/message/comment/draft/post sub-lists. */
export function untilParam(hint: string): Param {
  return {
    key: "until",
    label: "Until (Unix timestamp)",
    type: "number",
    default: 0,
    hint,
    advanced: true,
  };
}

/**
 * Turn the flat, comma-separated {@link CONVERSATION_ROUTING_PARAMS} input into
 * the snake_case request-body fields Missive documents, shared by
 * `draft-create`, `message-create`, `post-create` and `conversation-update`.
 * `references` is normalized to an array of strings (chevrons are optional
 * per the vendor's own docs, so they are passed through verbatim rather than
 * stripped or added).
 */
export function routingFields(input: Record<string, unknown>): Record<string, unknown> {
  return compact({
    conversation: input.conversation,
    references: toIdList(input.references).length ? toIdList(input.references) : undefined,
    organization: input.organization,
    team: input.team,
    force_team: input.forceTeam === true ? true : undefined,
    add_users: toIdList(input.addUsers).length ? toIdList(input.addUsers) : undefined,
    add_assignees: toIdList(input.addAssignees).length ? toIdList(input.addAssignees) : undefined,
    remove_assignees: toIdList(input.removeAssignees).length
      ? toIdList(input.removeAssignees)
      : undefined,
    conversation_subject: input.conversationSubject,
    conversation_color: input.conversationColor,
    add_shared_labels: toIdList(input.addSharedLabels).length
      ? toIdList(input.addSharedLabels)
      : undefined,
    remove_shared_labels: toIdList(input.removeSharedLabels).length
      ? toIdList(input.removeSharedLabels)
      : undefined,
    add_to_inbox: input.addToInbox === true ? true : undefined,
    add_to_team_inbox: input.addToTeamInbox === true ? true : undefined,
    close: input.close === true ? true : undefined,
  });
}

/** An `attachments` array of `{base64_data, filename}` (and optionally `id` for inline refs). */
export const ATTACHMENTS_PARAM: Param = {
  key: "attachments",
  label: "Attachments (JSON)",
  type: "json",
  default: "",
  hint: 'Array of {"base64_data": "…", "filename": "logo.png"}. Up to 25 files; total request ' +
    "payload must stay under 10 MB.",
  advanced: true,
};
