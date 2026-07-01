import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channelId: string;
  limit?: number;
  cursor?: string;
}

const channelMember: ActionDefinition<Input> = {
  key: "channel-member",
  type: "read",
  resource: "channel",
  title: "Get Channel Members",
  description: "Lists members of a channel (conversations.members).",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "cursor", label: "Cursor", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/conversations.members", {
      query: {
        channel: input.channelId,
        limit: input.limit ?? 100,
        cursor: input.cursor,
      },
    });
  },
};

export default channelMember;
