import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient } from "../lib/client.ts";

interface Input {
  id: string;
  limit?: number;
  until?: number;
}

/**
 * `GET /v1/conversations/:id/posts` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Conversations,
 * 2026-08-29.
 *
 * Newest-to-oldest; paginate with `until` set to the previous page's oldest
 * `created_at` (a page can return more than `limit`).
 */
const action: ActionDefinition<Input> = {
  key: "conversation-posts-list",
  type: "read",
  resource: "post",
  title: "List Conversation Posts",
  description: "List posts (integration/automation entries) in a conversation, newest first.",
  params: [
    { key: "id", label: "Conversation ID", type: "string", required: true },
    { key: "limit", label: "Limit", type: "number", default: 10, hint: "Max: 10." },
    {
      key: "until",
      label: "Until (Unix timestamp)",
      type: "number",
      default: 0,
      advanced: true,
      hint: "Use the created_at of the oldest post from the previous page.",
    },
  ],
  output: [
    { key: "posts", type: "array", label: "Posts" },
  ],

  async execute(input, ctx) {
    if (!input.id) throw new Error("`id` is required");
    const res = await new MissiveClient(ctx).json<{ posts: unknown[] }>(
      `/conversations/${encodeURIComponent(input.id)}/posts`,
      { query: compact({ limit: input.limit, until: input.until }) },
    );
    return res.posts;
  },
};

export default action;
