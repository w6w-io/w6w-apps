import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channelId: string;
  userId: string;
}

const channelKick: ActionDefinition<Input> = {
  key: "channel-kick",
  type: "perform",
  resource: "channel",
  title: "Kick from Channel",
  description: "Removes a user from a channel (conversations.kick).",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "userId", label: "User ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/conversations.kick", {
      method: "POST",
      body: { channel: input.channelId, user: input.userId },
    });
  },
};

export default channelKick;
