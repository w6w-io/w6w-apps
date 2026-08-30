import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/** `GET /v1/messages/{id}` — get a message by its unique identifier. */
interface Input {
  id: string;
}

const messageGet: ActionDefinition<Input> = {
  key: "message-get",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Get a message by its unique identifier.",
  params: [
    {
      key: "id",
      label: "Message ID",
      type: "string",
      required: true,
      placeholder: "AC123abc",
      hint: "The unique identifier of the message.",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "Message (id, to, from, text, phoneNumberId, conversationId, direction, userId, " +
        "status, createdAt, updatedAt, media)",
    },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json(`/messages/${encodeURIComponent(input.id)}`);
  },
};

export default messageGet;
