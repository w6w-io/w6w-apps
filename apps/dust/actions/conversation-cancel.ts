import type { ActionDefinition } from "@w6w/types";
import { CONVERSATION_ID_PARAM } from "../lib/params.ts";
import { DustClient } from "../lib/client.ts";

/**
 * `POST /assistant/conversations/{cId}/cancel` — verified against the
 * vendor's OpenAPI document ("Cancel message generation in a conversation").
 *
 * Idempotent: cancelling an already-cancelled (or already-finished) message
 * id is a no-op, not an error condition a retry could make worse.
 */
interface Input {
  cId: string;
  messageIds: string;
}

interface Output {
  success: boolean;
}

const conversationCancel: ActionDefinition<Input, Output> = {
  key: "conversation-cancel",
  type: "perform",
  resource: "conversation",
  title: "Cancel Message Generation",
  description: "Stop one or more in-progress agent messages from continuing to generate.",
  idempotent: true,
  params: [
    CONVERSATION_ID_PARAM,
    {
      key: "messageIds",
      label: "Message ID(s)",
      type: "string",
      required: true,
      hint: "Comma-separated message `sId`s to cancel.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Whether the cancellation was accepted" }],

  execute(input, ctx) {
    return new DustClient(ctx).json<Output>(
      `/assistant/conversations/${encodeURIComponent(input.cId)}/cancel`,
      {
        method: "POST",
        body: { messageIds: input.messageIds.split(",").map((s) => s.trim()).filter(Boolean) },
      },
    );
  },
};

export default conversationCancel;
