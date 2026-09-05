import type { ActionDefinition } from "@w6w/types";
import { CONVERSATION_ID_PARAM } from "../lib/params.ts";
import { DustClient } from "../lib/client.ts";

/**
 * `GET /assistant/conversations/{cId}` — verified against the vendor's
 * OpenAPI document ("Get a conversation").
 *
 * This is the read side of the create/poll pattern: after Create Conversation
 * with `blocking: false`, or after mentioning an agent again via Create
 * Message, this is what reads back the agent's answer (and its status —
 * Dust's own message objects carry `status: "created" | "succeeded" |
 * "failed" | "cancelled"`, per the schema's example values).
 */
interface Input {
  cId: string;
  limit?: number;
  lastValue?: string;
}

const conversationGet: ActionDefinition<Input> = {
  key: "conversation-get",
  type: "read",
  resource: "conversation",
  title: "Get Conversation",
  description: "Retrieve a conversation and its messages, including agent replies.",
  params: [
    CONVERSATION_ID_PARAM,
    {
      key: "limit",
      label: "Message limit",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Omit to return every message.",
    },
    {
      key: "lastValue",
      label: "Cursor",
      type: "string",
      advanced: true,
      hint: "The message-rank cursor from a previous page, to continue paginating.",
    },
  ],
  output: [{ key: "conversation", type: "object", label: "Conversation, including its messages" }],

  execute(input, ctx) {
    return new DustClient(ctx).json(`/assistant/conversations/${encodeURIComponent(input.cId)}`, {
      query: { limit: input.limit, lastValue: input.lastValue },
    });
  },
};

export default conversationGet;
