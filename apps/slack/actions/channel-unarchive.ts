import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channelId: string;
}

const channelUnarchive: ActionDefinition<Input> = {
  key: "channel-unarchive",
  type: "perform",
  resource: "channel",
  title: "Unarchive Channel",
  description: "Reverses an archive (conversations.unarchive).",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/conversations.unarchive", {
      method: "POST",
      body: { channel: input.channelId },
    });
  },
};

export default channelUnarchive;
