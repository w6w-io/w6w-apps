import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { roomIdParam } from "../lib/params.ts";

interface Input {
  roomId: string;
  messageId?: string;
}

/**
 * `PUT /rooms/{room_id}/messages/read` — mark a chat's messages read up to a
 * given message. Omit the message ID to mark the whole chat read. Answers
 * `400` if the target message is already read.
 */
const roomMessageMarkRead: ActionDefinition<Input> = {
  key: "room-message-mark-read",
  type: "perform",
  resource: "message",
  title: "Mark Messages Read",
  description: "Mark a chat's messages read, up through the given message ID (or the whole chat).",
  idempotent: true,
  params: [
    roomIdParam,
    {
      key: "messageId",
      label: "Up to message ID",
      type: "string",
      hint:
        "Marks everything up to and including this message as read. Leave empty for the whole " +
        "chat.",
    },
  ],
  output: [
    { key: "unread_num", type: "number", label: "Remaining unread messages in this chat" },
    { key: "mention_num", type: "number", label: "Remaining unread mentions of me in this chat" },
  ],

  execute(input, ctx) {
    return new ChatworkClient(ctx).json(
      `/rooms/${encodeURIComponent(input.roomId)}/messages/read`,
      {
        method: "PUT",
        form: { message_id: input.messageId },
      },
    );
  },
};

export default roomMessageMarkRead;
