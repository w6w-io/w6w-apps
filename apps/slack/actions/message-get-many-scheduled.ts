import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channel?: string;
  latest?: string;
  oldest?: string;
  limit?: number;
  cursor?: string;
}

const messageGetManyScheduled: ActionDefinition<Input> = {
  key: "message-get-many-scheduled",
  type: "read",
  resource: "message",
  title: "Get Many Scheduled Messages",
  description: "Lists pending scheduled messages (chat.scheduledMessages.list).",
  params: [
    { key: "channel", label: "Channel ID", type: "string" },
    { key: "latest", label: "Latest", type: "datetime" },
    { key: "oldest", label: "Oldest", type: "datetime" },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "cursor", label: "Cursor", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/chat.scheduledMessages.list", {
      query: {
        channel: input.channel,
        latest: input.latest ? Math.floor(new Date(input.latest).getTime() / 1000) : undefined,
        oldest: input.oldest ? Math.floor(new Date(input.oldest).getTime() / 1000) : undefined,
        limit: input.limit ?? 100,
        cursor: input.cursor,
      },
    });
  },
};

export default messageGetManyScheduled;
