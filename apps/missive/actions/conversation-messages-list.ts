import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient } from "../lib/client.ts";

interface Input {
  id: string;
  limit?: number;
  until?: number;
}

/**
 * `GET /v1/conversations/:id/messages` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Conversations,
 * 2026-08-29. Draft messages are excluded (use List Conversation Drafts).
 *
 * Newest-to-oldest; paginate with `until` set to the previous page's oldest
 * `delivered_at` (a page can return more than `limit`). The `body` field is
 * only present on Get a Message, not in this list.
 */
const action: ActionDefinition<Input> = {
  key: "conversation-messages-list",
  type: "read",
  resource: "message",
  title: "List Conversation Messages",
  description: "List delivered (non-draft) messages in a conversation, newest first.",
  params: [
    { key: "id", label: "Conversation ID", type: "string", required: true },
    { key: "limit", label: "Limit", type: "number", default: 10, hint: "Max: 10." },
    {
      key: "until",
      label: "Until (Unix timestamp)",
      type: "number",
      default: 0,
      advanced: true,
      hint: "Use the delivered_at of the oldest message from the previous page.",
    },
  ],
  output: [
    { key: "messages", type: "array", label: "Messages" },
  ],

  async execute(input, ctx) {
    if (!input.id) throw new Error("`id` is required");
    const res = await new MissiveClient(ctx).json<{ messages: unknown[] }>(
      `/conversations/${encodeURIComponent(input.id)}/messages`,
      { query: compact({ limit: input.limit, until: input.until }) },
    );
    return res.messages;
  },
};

export default action;
