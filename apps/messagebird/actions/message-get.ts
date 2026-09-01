import type { ActionDefinition } from "@w6w/types";
import { MessageBirdClient } from "../lib/client.ts";

interface Input {
  messageId: string;
}

/**
 * Retrieve an SMS message by ID: `GET /messages/{messageId}`. Verified
 * against developers.messagebird.com/api/sms-messaging/#view.
 */
const messageGet: ActionDefinition<Input> = {
  key: "message-get",
  type: "read",
  resource: "sms",
  title: "Get Message",
  description: "Retrieve an SMS message and its per-recipient delivery status.",
  params: [
    {
      key: "messageId",
      label: "Message ID",
      type: "string",
      required: true,
      hint: "Returned as `id` when the message was sent or listed.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "direction", type: "string", label: "Direction" },
    { key: "originator", type: "string", label: "Originator" },
    { key: "body", type: "string", label: "Body" },
    { key: "recipients", type: "object", label: "Recipients" },
  ],

  execute(input, ctx) {
    const client = new MessageBirdClient(ctx);
    return client.request(`/messages/${encodeURIComponent(input.messageId)}`);
  },
};

export default messageGet;
