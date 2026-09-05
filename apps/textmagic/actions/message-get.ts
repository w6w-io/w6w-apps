import type { ActionDefinition } from "@w6w/types";
import { TextMagicClient } from "../lib/client.ts";

/** `GET /api/v2/messages/{id}` — one outbound message's full delivery record. */
interface Input {
  id: number;
}

const messageGet: ActionDefinition<Input> = {
  key: "message-get",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Fetch one outbound message, including its delivery status.",
  params: [{ key: "id", label: "Message ID", type: "number", required: true }],
  output: [
    { key: "id", type: "number", label: "Message ID" },
    { key: "text", type: "string", label: "Message text" },
    { key: "receiver", type: "string", label: "Recipient phone number" },
    {
      key: "status",
      type: "string",
      label: "Delivery status code — see docs.textmagic.com/#section/Delivery-status-codes",
    },
    { key: "partsCount", type: "number", label: "Number of SMS parts sent" },
  ],

  execute(input, ctx) {
    return new TextMagicClient(ctx).json(`/messages/${encodeURIComponent(input.id)}`);
  },
};

export default messageGet;
