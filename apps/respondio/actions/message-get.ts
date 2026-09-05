import type { ActionDefinition } from "@w6w/types";
import { assertIdentifier, RespondioClient } from "../lib/client.ts";

/**
 * `GET /contact/{identifier}/message/{messageId}` — `MessagingClient.get` in
 * the official SDK. Answers `GetMessageResponse` directly.
 */
interface Input {
  identifier: string;
  messageId: number;
}

const messageGet: ActionDefinition<Input> = {
  key: "message-get",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Look up one message by id, including its delivery status.",
  params: [
    { key: "identifier", label: "Contact identifier", type: "string", required: true },
    { key: "messageId", label: "Message ID", type: "number", required: true },
  ],
  output: [
    { key: "messageId", type: "number", label: "Message ID" },
    { key: "channelMessageId", type: "string", label: "Channel-native message ID" },
    { key: "contactId", type: "number", label: "Contact ID" },
    { key: "channelId", type: "number", label: "Channel ID" },
    { key: "traffic", type: "string", label: "Direction (incoming/outgoing)" },
    { key: "message", type: "object", label: "Message content" },
    { key: "status", type: "array", label: "Delivery status history" },
    { key: "sender", type: "object", label: "Sender" },
  ],

  execute(input, ctx) {
    const identifier = assertIdentifier(input.identifier);
    if (!Number.isFinite(input.messageId)) throw new Error("Message ID is required");
    return new RespondioClient(ctx).get(`/contact/${identifier}/message/${input.messageId}`);
  },
};

export default messageGet;
