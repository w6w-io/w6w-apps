import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { messageIdParam, roomIdParam } from "../lib/params.ts";

interface Input {
  roomId: string;
  messageId: string;
}

/**
 * `DELETE /rooms/{room_id}/messages/{message_id}` — delete a message you
 * posted. Only the original author may delete a message.
 */
const roomMessageDelete: ActionDefinition<Input> = {
  key: "room-message-delete",
  type: "perform",
  resource: "message",
  title: "Delete Message",
  description: "Delete a message you previously posted.",
  idempotent: true,
  params: [roomIdParam, messageIdParam],
  output: [{ key: "message_id", type: "string", label: "Deleted message ID" }],

  execute(input, ctx) {
    return new ChatworkClient(ctx).json(
      `/rooms/${encodeURIComponent(input.roomId)}/messages/${encodeURIComponent(input.messageId)}`,
      { method: "DELETE" },
    );
  },
};

export default roomMessageDelete;
