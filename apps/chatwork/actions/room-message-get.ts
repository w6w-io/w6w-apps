import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { messageIdParam, roomIdParam } from "../lib/params.ts";

interface Input {
  roomId: string;
  messageId: string;
}

/** `GET /rooms/{room_id}/messages/{message_id}` — one message's full detail. */
const roomMessageGet: ActionDefinition<Input> = {
  key: "room-message-get",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Fetch one message's full detail.",
  params: [roomIdParam, messageIdParam],
  output: [
    { key: "message_id", type: "string", label: "Message ID" },
    { key: "account", type: "object", label: "Who posted it" },
    { key: "body", type: "string", label: "Message text" },
    { key: "send_time", type: "number", label: "Sent at (Unix seconds)" },
    { key: "update_time", type: "number", label: "Last edited at (Unix seconds), 0 if never" },
  ],

  execute(input, ctx) {
    return new ChatworkClient(ctx).json(
      `/rooms/${encodeURIComponent(input.roomId)}/messages/${encodeURIComponent(input.messageId)}`,
    );
  },
};

export default roomMessageGet;
