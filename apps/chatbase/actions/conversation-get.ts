import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import { agentIdParam, conversationIdParam } from "../lib/params.ts";

/**
 * `GET /agents/{agentId}/conversations/{conversationId}` — metadata plus its
 * most recent messages. Only finds conversations created through the API;
 * use List Conversations For A User's export path (or Export Conversations)
 * for one from any source (widget, WhatsApp, etc.) — see Chatbase's own note
 * on this endpoint.
 */
interface Input {
  agentId: string;
  conversationId: string;
}

const conversationGet: ActionDefinition<Input> = {
  key: "conversation-get",
  type: "read",
  resource: "conversation",
  title: "Get Conversation",
  description:
    "Get conversation metadata and its most recent messages. Only finds conversations created " +
    "through the API — use the messages endpoint's cursor to page further back.",
  params: [agentIdParam, conversationIdParam],
  output: [
    { key: "data", type: "object", label: "Conversation metadata plus its recent messages" },
    { key: "pagination", type: "object", label: "Cursor for List Conversation Messages" },
  ],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/conversations/` +
        `${encodeURIComponent(input.conversationId)}`,
    );
  },
};

export default conversationGet;
