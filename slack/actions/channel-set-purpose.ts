import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channelId: string;
  purpose: string;
}

const channelSetPurpose: ActionDefinition<Input> = {
  key: "channel-set-purpose",
  type: "perform",
  resource: "channel",
  title: "Set Channel Purpose",
  description: "Sets the purpose (description) of a channel (conversations.setPurpose).",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "purpose", label: "Purpose", type: "text", required: true },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const res = await client.request<{ channel?: unknown }>("/conversations.setPurpose", {
      method: "POST",
      body: { channel: input.channelId, purpose: input.purpose },
    });
    return res.channel ?? res;
  },
};

export default channelSetPurpose;
