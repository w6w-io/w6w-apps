import type { ActionDefinition } from "@w6w/types";
import { compact, HeartbeatClient } from "../lib/client.ts";
import { RICH_TEXT_HINT } from "../lib/params.ts";

/**
 * `PUT /v0/chatChannel/{channelID}/message` — send a message to a CHAT
 * channel.
 *
 * Documented as `204 No Content`, confirmed.
 */
interface Input {
  channelID: string;
  text: string;
  from: string;
  createdAt?: string;
}

const createChatMessage: ActionDefinition<Input> = {
  key: "create-chat-message",
  type: "perform",
  resource: "chat-message",
  title: "Send Chat Channel Message",
  description: "Send a message to a CHAT channel.",
  idempotent: false,
  params: [
    { key: "channelID", label: "Chat Channel ID", type: "string", required: true },
    { key: "text", label: "Content", type: "text", required: true, hint: RICH_TEXT_HINT },
    {
      key: "from",
      label: "From (user ID)",
      type: "string",
      required: true,
      hint: "Must be an admin. Unlike other message actions, this one is required by the vendor.",
    },
    {
      key: "createdAt",
      label: "Created at (override)",
      type: "datetime",
      hint: "ISO 8601. Overrides the default creation timestamp.",
    },
  ],
  output: [],

  async execute(input, ctx) {
    await new HeartbeatClient(ctx).json(
      `/chatChannel/${encodeURIComponent(input.channelID)}/message`,
      {
        method: "PUT",
        body: compact({ text: input.text, from: input.from, createdAt: input.createdAt }),
      },
    );
    return {};
  },
};

export default createChatMessage;
