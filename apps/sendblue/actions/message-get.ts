import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

interface Input {
  messageId: string;
}

/** `GET /api/v2/messages/{message_id}` — retrieve one message by its `message_handle`. */
const messageGet: ActionDefinition<Input> = {
  key: "message-get",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Retrieve a single message by its message_handle.",
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
  ],
  output: [
    { key: "data", type: "object", label: "Message" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get(`/api/v2/messages/${encodeURIComponent(input.messageId)}`);
  },
};

export default messageGet;
