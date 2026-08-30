import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient, compact } from "../lib/client.ts";
import { agentIdParam } from "../lib/params.ts";

/**
 * `POST /agents/{agentId}/chat` — send a message, get the agent's response.
 *
 * Always sent with `stream: false`. Chatbase's default is `true` (Server-Sent
 * Events), but an Action returns one JSON result to the next workflow step,
 * not an open connection — SSE has no meaningful projection onto that model.
 * With `stream: false` the API answers the same content as a single JSON
 * object instead of an event stream (per `/docs/api-v2/streaming` §Non-
 * Streaming Mode), wrapped in `{"data": …}`, which is unwrapped here.
 *
 * Omit `message` only when continuing after a `submit-tool-result` call —
 * otherwise it is required.
 */
interface Input {
  agentId: string;
  message?: string;
  conversationId?: string;
  userId?: string;
}

const agentChat: ActionDefinition<Input> = {
  key: "agent-chat",
  type: "perform",
  resource: "conversation",
  title: "Chat With Agent",
  description: "Send a message to an agent and get its response. Non-streaming.",
  idempotent: false,
  params: [
    agentIdParam,
    {
      key: "message",
      label: "Message",
      type: "text",
      hint: "Omit only when continuing a conversation right after Submit Tool Result.",
    },
    {
      key: "conversationId",
      label: "Conversation ID",
      type: "string",
      hint: "Continue an existing conversation. Omit to start a new one.",
    },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      validation: { pattern: "^[a-zA-Z0-9._-]+$", maxLength: 128 },
      hint: "Associates a user with a NEW conversation. Ignored (and immutable) once a " +
        "conversation exists — only applied when conversationId is omitted.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Assistant message ID" },
    { key: "role", type: "string", label: 'Always "assistant"' },
    { key: "parts", type: "array", label: "Message content parts (text, tool-call, tool-result)" },
    { key: "metadata", type: "object", label: "conversationId, finishReason, usage, …" },
  ],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).unwrap(
      `/agents/${encodeURIComponent(input.agentId)}/chat`,
      {
        method: "POST",
        body: compact({
          message: input.message,
          conversationId: input.conversationId,
          userId: input.userId,
          stream: false,
        }),
      },
    );
  },
};

export default agentChat;
