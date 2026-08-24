import type { ActionDefinition } from "@w6w/types";
import { ClickSendClient } from "../lib/client.ts";

interface Input {
  messageId: string;
}

/**
 * `PUT /voice/{message_id}/cancel` — cancel a scheduled (not-yet-placed) voice call.
 * Same envelope shape as `sms-cancel`: a confirmation message with no structured data.
 */
const voiceCancel: ActionDefinition<Input> = {
  key: "voice-cancel",
  type: "perform",
  idempotent: true,
  resource: "voice",
  title: "Cancel Scheduled Voice Call",
  description: "Cancel a scheduled voice call before it's placed (PUT /voice/{message_id}/cancel).",
  params: [
    {
      key: "messageId",
      label: "Message ID",
      type: "string",
      required: true,
      hint: "The `messageId` returned by Send Voice Call.",
    },
  ],
  output: [{ key: "message", type: "string", label: "Confirmation message" }],

  async execute(input, ctx) {
    const client = new ClickSendClient(ctx);
    const envelope = await client.envelope(
      `/voice/${encodeURIComponent(input.messageId)}/cancel`,
      { method: "PUT" },
    );
    return { message: envelope.response_msg };
  },
};

export default voiceCancel;
