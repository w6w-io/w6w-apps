import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import {
  agentIdParam,
  conversationIdParam,
  paginationParams,
  paginationQuery,
} from "../lib/params.ts";

/**
 * `GET /agents/{agentId}/conversations/{conversationId}/messages` — paginates
 * **backward from the newest message**. The first page is the most recent
 * messages; passing `cursor` fetches the next OLDER page. Messages within
 * each page are chronological (oldest → newest). The cursor from Get
 * Conversation is compatible with this endpoint too.
 */
interface Input {
  agentId: string;
  conversationId: string;
  cursor?: string;
  limit?: number;
}

const conversationMessagesList: ActionDefinition<Input> = {
  key: "conversation-messages-list",
  type: "read",
  resource: "conversation",
  title: "List Conversation Messages",
  description:
    "List a conversation's messages, paginating backward from the newest. Each page is " +
    "chronological oldest to newest.",
  params: [agentIdParam, conversationIdParam, ...paginationParams()],
  output: [
    { key: "data", type: "array", label: "Messages, oldest to newest within this page" },
    { key: "pagination", type: "object", label: "Cursor for the next OLDER page" },
  ],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/conversations/` +
        `${encodeURIComponent(input.conversationId)}/messages`,
      { query: paginationQuery(input) },
    );
  },
};

export default conversationMessagesList;
