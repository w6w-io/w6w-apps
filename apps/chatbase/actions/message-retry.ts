import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import { agentIdParam, conversationIdParam } from "../lib/params.ts";

/**
 * `POST /agents/{agentId}/conversations/{conversationId}/retry` — truncates
 * the conversation at `messageId` and re-sends the preceding user message.
 * Always sent with `stream: false`; see `agent-chat.ts` for why.
 */
interface Input {
  agentId: string;
  conversationId: string;
  messageId: string;
}

const messageRetry: ActionDefinition<Input> = {
  key: "message-retry",
  type: "perform",
  resource: "conversation",
  title: "Retry Message",
  description:
    "Retry generating an assistant response from a given message, truncating the conversation " +
    "at that point.",
  idempotent: false,
  params: [
    agentIdParam,
    conversationIdParam,
    {
      key: "messageId",
      label: "Message ID",
      type: "string",
      required: true,
      hint: "Truncates the conversation at this message, then re-sends the preceding user " +
        "message. If no user message precedes it, Chatbase answers CHAT_RETRY_NO_USER_MESSAGE.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "New assistant message ID" },
    { key: "parts", type: "array", label: "Message content parts" },
    { key: "metadata", type: "object", label: "conversationId, finishReason, usage, …" },
  ],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).unwrap(
      `/agents/${encodeURIComponent(input.agentId)}/conversations/` +
        `${encodeURIComponent(input.conversationId)}/retry`,
      { method: "POST", body: { messageId: input.messageId, stream: false } },
    );
  },
};

export default messageRetry;
