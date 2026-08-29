import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import { agentIdParam, paginationParams, paginationQuery, userIdParam } from "../lib/params.ts";

/**
 * `GET /agents/{agentId}/users/{userId}/conversations` — every conversation
 * associated with a `userId` (set once, immutably, when a conversation is
 * created), ordered by last activity.
 */
interface Input {
  agentId: string;
  userId: string;
  cursor?: string;
  limit?: number;
}

const conversationUserList: ActionDefinition<Input> = {
  key: "conversation-user-list",
  type: "read",
  resource: "conversation",
  title: "List Conversations For A User",
  description: "List conversations for a specific user under an agent, ordered by last activity.",
  params: [agentIdParam, userIdParam, ...paginationParams()],
  output: [
    { key: "data", type: "array", label: "Conversation metadata" },
    { key: "pagination", type: "object", label: "Cursor and hasMore for the next page" },
  ],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/users/` +
        `${encodeURIComponent(input.userId)}/conversations`,
      { query: paginationQuery(input) },
    );
  },
};

export default conversationUserList;
