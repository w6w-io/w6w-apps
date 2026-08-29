import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient } from "../lib/client.ts";

interface Input {
  id: string;
  limit?: number;
  until?: number;
}

/**
 * `GET /v1/conversations/:id/comments` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Conversations,
 * 2026-08-29.
 *
 * Newest-to-oldest; paginate with `until` set to the previous page's oldest
 * `created_at` (a page can return more than `limit`). A comment tied to a
 * task embeds the full task object.
 */
const action: ActionDefinition<Input> = {
  key: "conversation-comments-list",
  type: "read",
  resource: "comment",
  title: "List Conversation Comments",
  description: "List internal comments on a conversation, newest first.",
  params: [
    { key: "id", label: "Conversation ID", type: "string", required: true },
    { key: "limit", label: "Limit", type: "number", default: 10, hint: "Max: 10." },
    {
      key: "until",
      label: "Until (Unix timestamp)",
      type: "number",
      default: 0,
      advanced: true,
      hint: "Use the created_at of the oldest comment from the previous page.",
    },
  ],
  output: [
    { key: "comments", type: "array", label: "Comments" },
  ],

  async execute(input, ctx) {
    if (!input.id) throw new Error("`id` is required");
    const res = await new MissiveClient(ctx).json<{ comments: unknown[] }>(
      `/conversations/${encodeURIComponent(input.id)}/comments`,
      { query: compact({ limit: input.limit, until: input.until }) },
    );
    return res.comments;
  },
};

export default action;
