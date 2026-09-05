import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";
import { cursorParams } from "../lib/params.ts";

/**
 * `GET /v0/chatChannel/{channelID}/messages` — cursor-paginated chat history.
 *
 * Unlike `list-documents`, this endpoint's response is documented as
 * `{data, hasMore}` — a real "is there another page?" signal, which this
 * action passes straight through.
 */
interface Input {
  channelID: string;
  startingAfter?: string;
  limit?: number;
}

const listChatChannelMessages: ActionDefinition<Input> = {
  key: "list-chat-channel-messages",
  type: "search",
  resource: "chat-message",
  title: "List Chat Channel Messages",
  description: "Page through a CHAT channel's message history, oldest-cursor forward.",
  params: [
    { key: "channelID", label: "Chat Channel ID", type: "string", required: true },
    ...cursorParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Messages in this page" },
    { key: "hasMore", type: "boolean", label: "Whether another page follows" },
  ],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json(
      `/chatChannel/${encodeURIComponent(input.channelID)}/messages`,
      {
        query: { startingAfter: input.startingAfter, limit: input.limit },
      },
    );
  },
};

export default listChatChannelMessages;
