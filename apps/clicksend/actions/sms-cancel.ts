import type { ActionDefinition } from "@w6w/types";
import { ClickSendClient } from "../lib/client.ts";

interface Input {
  messageId: string;
}

/**
 * `PUT /sms/{message_id}/cancel` — cancel a scheduled (not-yet-sent) SMS.
 *
 * Only affects messages still queued with a future `schedule` time; ClickSend
 * cannot recall a message the network has already accepted. The response body
 * is a bare `response_msg` confirmation with `data: []` — there is nothing
 * structured to unwrap, so this Action returns the envelope's message text.
 */
const smsCancel: ActionDefinition<Input> = {
  key: "sms-cancel",
  type: "perform",
  idempotent: true,
  resource: "sms",
  title: "Cancel Scheduled SMS",
  description: "Cancel a scheduled SMS before it sends (PUT /sms/{message_id}/cancel).",
  params: [
    {
      key: "messageId",
      label: "Message ID",
      type: "string",
      required: true,
      hint: "The `messageId` returned by Send SMS.",
    },
  ],
  output: [{ key: "message", type: "string", label: "Confirmation message" }],

  async execute(input, ctx) {
    const client = new ClickSendClient(ctx);
    const envelope = await client.envelope(
      `/sms/${encodeURIComponent(input.messageId)}/cancel`,
      { method: "PUT" },
    );
    return { message: envelope.response_msg };
  },
};

export default smsCancel;
