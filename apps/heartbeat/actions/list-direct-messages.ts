import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/**
 * `GET /v0/directMessages/{chatID}` — the 100 most recent messages in a
 * direct chat.
 *
 * Heartbeat states this is only reachable "for direct messages that include
 * at least one admin user" — a chat between two non-admins 404s (or is
 * otherwise refused) here, by design, not as a bug in this app.
 */
interface Input {
  chatID: string;
}

const listDirectMessages: ActionDefinition<Input> = {
  key: "list-direct-messages",
  type: "read",
  resource: "direct-message",
  title: "List Direct Messages",
  description:
    "Return the 100 most recent messages from a direct chat. Only reachable when the chat " +
    "includes at least one admin user.",
  params: [{ key: "chatID", label: "Direct Chat ID", type: "string", required: true }],
  output: [{ key: "messages", type: "array", label: "Messages (up to 100, newest last)" }],

  async execute(input, ctx) {
    const messages = await new HeartbeatClient(ctx).json(
      `/directMessages/${encodeURIComponent(input.chatID)}`,
    );
    return { messages };
  },
};

export default listDirectMessages;
