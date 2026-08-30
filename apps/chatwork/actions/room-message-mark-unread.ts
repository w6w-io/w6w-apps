import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { messageIdParam, roomIdParam } from "../lib/params.ts";

interface Input {
  roomId: string;
  messageId: string;
}

/**
 * `PUT /rooms/{room_id}/messages/unread` — mark a chat's messages unread from
 * a given message onward. Answers `400` if the target message is already
 * unread.
 */
const roomMessageMarkUnread: ActionDefinition<Input> = {
  key: "room-message-mark-unread",
  type: "perform",
  resource: "message",
  title: "Mark Messages Unread",
  description: "Mark a chat's messages unread, from the given message ID onward.",
  idempotent: true,
  params: [roomIdParam, { ...messageIdParam, label: "From message ID" }],
  output: [
    { key: "unread_num", type: "number", label: "Unread messages in this chat" },
    { key: "mention_num", type: "number", label: "Unread mentions of me in this chat" },
  ],

  execute(input, ctx) {
    return new ChatworkClient(ctx).json(
      `/rooms/${encodeURIComponent(input.roomId)}/messages/unread`,
      { method: "PUT", form: { message_id: input.messageId } },
    );
  },
};

export default roomMessageMarkUnread;
