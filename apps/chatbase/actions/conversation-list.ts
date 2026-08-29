import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import { agentIdParam, paginationParams, paginationQuery } from "../lib/params.ts";

/** `GET /agents/{agentId}/conversations` — ordered by `createdAt`. */
interface Input {
  agentId: string;
  cursor?: string;
  limit?: number;
}

const conversationList: ActionDefinition<Input> = {
  key: "conversation-list",
  type: "read",
  resource: "conversation",
  title: "List Conversations",
  description: "List conversations for an agent, ordered by createdAt.",
  params: [agentIdParam, ...paginationParams()],
  output: [
    { key: "data", type: "array", label: "Conversation metadata (no messages)" },
    { key: "pagination", type: "object", label: "Cursor and hasMore for the next page" },
  ],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/conversations`,
      { query: paginationQuery(input) },
    );
  },
};

export default conversationList;
