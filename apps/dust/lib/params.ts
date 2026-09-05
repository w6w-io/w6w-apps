import type { Param } from "@w6w/types";

/**
 * Shared param fragments, so the `Context` and `Mention` shapes the vendor
 * repeats across "create conversation", "create message" and "create content
 * fragment" are built once.
 *
 * `Context.username` and `Context.timezone` are the schema's only *required*
 * fields (verified against `components.schemas.Context` in the vendor's
 * OpenAPI document) — Dust attributes every message to a human-readable
 * identity even when the caller is a workflow, not a logged-in user.
 */
export function contextParams(): Param[] {
  return [
    {
      key: "username",
      label: "Username",
      type: "string",
      required: true,
      default: "workflow",
      hint: "Attributed as the message's author inside Dust. Required by the API.",
    },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      required: true,
      default: "UTC",
      hint: "IANA timezone (e.g. `America/New_York`). Required by the API.",
    },
    {
      key: "fullName",
      label: "Full name",
      type: "string",
      advanced: true,
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      advanced: true,
    },
  ];
}

export interface ContextInput {
  username: string;
  timezone: string;
  fullName?: string;
  email?: string;
}

export function buildContext(input: ContextInput): Record<string, unknown> {
  const context: Record<string, unknown> = { username: input.username, timezone: input.timezone };
  if (input.fullName) context.fullName = input.fullName;
  if (input.email) context.email = input.email;
  return context;
}

/** Comma-separated agent ids -> `Mention[]`. Empty input is a message that mentions nobody. */
export function buildMentions(
  agentIds: string | string[] | undefined,
): Array<{ configurationId: string }> {
  if (!agentIds) return [];
  const list = Array.isArray(agentIds) ? agentIds : agentIds.split(",");
  return list.map((s) => s.trim()).filter(Boolean).map((configurationId) => ({ configurationId }));
}

export const AGENT_IDS_PARAM: Param = {
  key: "agentIds",
  label: "Mention agent ID(s)",
  type: "string",
  hint: "Comma-separated agent `sId`s to mention (from List Agents / Search Agents). Leave blank " +
    "to post a message that mentions no agent — Dust accepts an empty mentions array but no " +
    "agent will respond.",
};

export const CONVERSATION_ID_PARAM: Param = {
  key: "cId",
  label: "Conversation ID",
  type: "string",
  required: true,
  hint: "The `sId` of an existing conversation.",
};

export const SPACE_ID_PARAM: Param = {
  key: "spaceId",
  label: "Space ID",
  type: "string",
  required: true,
  hint: "The `sId` of a space (from List Spaces).",
};
