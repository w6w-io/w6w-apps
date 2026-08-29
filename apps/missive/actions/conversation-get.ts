import type { ActionDefinition } from "@w6w/types";
import { MissiveClient, unwrapSingle } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `GET /v1/conversations/:id` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Conversations,
 * 2026-08-29.
 *
 * Documented as returning `{"conversations": [{...}]}` — an array with one
 * item, not a bare object — because a merged conversation can resolve to a
 * different id than the one requested; the (old) id passed in keeps working.
 * This action unwraps that array and returns the single conversation.
 *
 * When the API token's user is a guest on the conversation, Missive returns
 * only `id` and `last_activity_at`.
 */
const action: ActionDefinition<Input> = {
  key: "conversation-get",
  type: "read",
  resource: "conversation",
  title: "Get Conversation",
  description: "Fetch a conversation by ID. If it was merged into another conversation, the " +
    "response's ID may differ from the one requested.",
  params: [
    { key: "id", label: "Conversation ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Conversation ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "last_activity_at", type: "number", label: "Last Activity At (Unix timestamp)" },
    { key: "shared_labels", type: "array", label: "Shared Labels" },
    { key: "team", type: "object", label: "Team" },
  ],

  async execute(input, ctx) {
    if (!input.id) throw new Error("`id` is required");
    const res = await new MissiveClient(ctx).json<{ conversations: unknown[] }>(
      `/conversations/${encodeURIComponent(input.id)}`,
    );
    return unwrapSingle(res.conversations);
  },
};

export default action;
