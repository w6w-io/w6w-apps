import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient, flag } from "../lib/client.ts";
import { roomIdParam } from "../lib/params.ts";

interface Input {
  roomId: string;
  body: string;
  selfUnread?: boolean;
}

/** `POST /rooms/{room_id}/messages` — post a new message to a chat. */
const roomMessageSend: ActionDefinition<Input> = {
  key: "room-message-send",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description: "Post a new message to a chat.",
  idempotent: false,
  params: [
    roomIdParam,
    {
      key: "body",
      label: "Message",
      type: "text",
      required: true,
      validation: { minLength: 1, maxLength: 65535 },
    },
    {
      key: "selfUnread",
      label: "Mark unread for me",
      type: "boolean",
      default: false,
      hint: "Off (default): the message is posted as already read by you. On: it is left unread.",
    },
  ],
  output: [{ key: "message_id", type: "string", label: "New message ID" }],

  execute(input, ctx) {
    return new ChatworkClient(ctx).json(`/rooms/${encodeURIComponent(input.roomId)}/messages`, {
      method: "POST",
      form: { body: input.body, self_unread: flag(input.selfUnread) },
    });
  },
};

export default roomMessageSend;
