import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channelId: string;
}

const channelGet: ActionDefinition<Input> = {
  key: "channel-get",
  type: "read",
  resource: "channel",
  title: "Get Channel",
  description: "Retrieves channel information (conversations.info).",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const res = await client.request<{ channel?: unknown }>("/conversations.info", {
      method: "POST",
      query: { channel: input.channelId },
    });
    return res.channel ?? res;
  },
};

export default channelGet;
