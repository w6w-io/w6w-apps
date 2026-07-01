import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channelId: string;
}

const channelJoin: ActionDefinition<Input> = {
  key: "channel-join",
  type: "perform",
  resource: "channel",
  title: "Join Channel",
  description: "Joins an existing channel (conversations.join).",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const res = await client.request<{ channel?: unknown }>("/conversations.join", {
      method: "POST",
      body: { channel: input.channelId },
    });
    return res.channel ?? res;
  },
};

export default channelJoin;
