import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient } from "../lib/client.ts";

interface Input {
  id: string;
  limit?: number;
  until?: number;
}

/**
 * `GET /v1/conversations/:id/drafts` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Conversations,
 * 2026-08-29.
 *
 * Newest-to-oldest; paginate with `until` set to the previous page's oldest
 * `delivered_at` (a page can return more than `limit`).
 */
const action: ActionDefinition<Input> = {
  key: "conversation-drafts-list",
  type: "read",
  resource: "draft",
  title: "List Conversation Drafts",
  description: "List draft messages in a conversation, newest first.",
  params: [
    { key: "id", label: "Conversation ID", type: "string", required: true },
    { key: "limit", label: "Limit", type: "number", default: 10, hint: "Max: 10." },
    {
      key: "until",
      label: "Until (Unix timestamp)",
      type: "number",
      default: 0,
      advanced: true,
      hint: "Use the delivered_at of the oldest draft from the previous page.",
    },
  ],
  output: [
    { key: "drafts", type: "array", label: "Drafts" },
  ],

  async execute(input, ctx) {
    if (!input.id) throw new Error("`id` is required");
    const res = await new MissiveClient(ctx).json<{ drafts: unknown[] }>(
      `/conversations/${encodeURIComponent(input.id)}/drafts`,
      { query: compact({ limit: input.limit, until: input.until }) },
    );
    return res.drafts;
  },
};

export default action;
