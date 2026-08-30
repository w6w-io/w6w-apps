import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import { agentIdParam, conversationIdParam } from "../lib/params.ts";

/**
 * `PATCH .../conversations/{conversationId}/messages/{messageId}/feedback` —
 * only assistant messages support feedback (`RESOURCE_MESSAGE_NOT_ASSISTANT`
 * otherwise). Pass "clear" to remove existing feedback.
 */
interface Input {
  agentId: string;
  conversationId: string;
  messageId: string;
  feedback: "positive" | "negative" | "clear";
}

const messageFeedbackUpdate: ActionDefinition<Input> = {
  key: "message-feedback-update",
  type: "perform",
  resource: "conversation",
  title: "Update Message Feedback",
  description: "Set or clear feedback on an assistant message.",
  idempotent: true,
  params: [
    agentIdParam,
    conversationIdParam,
    { key: "messageId", label: "Message ID", type: "string", required: true },
    {
      key: "feedback",
      label: "Feedback",
      type: "select",
      required: true,
      options: [
        { value: "positive", label: "Positive" },
        { value: "negative", label: "Negative" },
        { value: "clear", label: "Clear existing feedback" },
      ],
    },
  ],
  output: [{ key: "feedback", type: "string", label: "The feedback now set, or null" }],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).unwrap(
      `/agents/${encodeURIComponent(input.agentId)}/conversations/` +
        `${encodeURIComponent(input.conversationId)}/messages/` +
        `${encodeURIComponent(input.messageId)}/feedback`,
      {
        method: "PATCH",
        body: { feedback: input.feedback === "clear" ? null : input.feedback },
      },
    );
  },
};

export default messageFeedbackUpdate;
