import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient, flag } from "../lib/client.ts";
import { roomIdParam } from "../lib/params.ts";

interface Input {
  roomId: string;
  force?: boolean;
}

/**
 * `GET /rooms/{room_id}/messages` — a chat's message history.
 *
 * **This is a stateful, per-token cursor, not a plain history read.** With
 * `force` off (the documented default), Chatwork returns only the messages
 * posted since the *last time this same API token read this room* — an
 * empty `[]` commonly means "nothing new since your last call", not "this
 * chat has no messages". Turn `force` on to fetch up to the newest 100
 * messages regardless of that cursor. Calling this repeatedly with `force`
 * off from the same Connection will return different results each time by
 * design.
 *
 * Documents a `204 No Content` for the empty case; {@link ChatworkClient.list}
 * normalises that to `[]` either way.
 *
 * The vendor also documents `chatwork-message-limitation` /
 * `-summary` response headers, set when a free-plan account's message
 * history is being truncated. This action does not surface them; the
 * response body itself is unaffected by the limitation, only how far back it
 * reaches.
 */
const roomMessageList: ActionDefinition<Input> = {
  key: "room-message-list",
  type: "read",
  resource: "message",
  title: "List Messages",
  description: "List a chat's messages. With Force off, returns only messages posted since this " +
    "connection's last read of this chat (see the action's own notes for what that means).",
  params: [
    roomIdParam,
    {
      key: "force",
      label: "Force full fetch",
      type: "boolean",
      default: false,
      hint: "Off (default): only new messages since this connection's last read of this chat. " +
        "On: forces the newest messages, up to 100.",
    },
  ],
  output: [
    { key: "message_id", type: "string", label: "Message ID" },
    { key: "account", type: "object", label: "Who posted it" },
    { key: "body", type: "string", label: "Message text" },
    { key: "send_time", type: "number", label: "Sent at (Unix seconds)" },
    { key: "update_time", type: "number", label: "Last edited at (Unix seconds), 0 if never" },
  ],

  execute(input, ctx) {
    return new ChatworkClient(ctx).list(`/rooms/${encodeURIComponent(input.roomId)}/messages`, {
      query: { force: flag(input.force) },
    });
  },
};

export default roomMessageList;
