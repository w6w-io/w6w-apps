import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { messageIdParam, roomIdParam } from "../lib/params.ts";

interface Input {
  roomId: string;
  messageId: string;
  body: string;
}

/**
 * `PUT /rooms/{room_id}/messages/{message_id}` — edit a message you posted.
 * Only the original author may edit a message.
 */
const roomMessageUpdate: ActionDefinition<Input> = {
  key: "room-message-update",
  type: "perform",
  resource: "message",
  title: "Update Message",
  description: "Edit a message you previously posted.",
  idempotent: true,
  params: [
    roomIdParam,
    messageIdParam,
    {
      key: "body",
      label: "New message text",
      type: "text",
      required: true,
      validation: { minLength: 1, maxLength: 65535 },
    },
  ],
  output: [{ key: "message_id", type: "string", label: "Updated message ID" }],

  execute(input, ctx) {
    return new ChatworkClient(ctx).json(
      `/rooms/${encodeURIComponent(input.roomId)}/messages/${encodeURIComponent(input.messageId)}`,
      { method: "PUT", form: { body: input.body } },
    );
  },
};

export default roomMessageUpdate;
