import type { ActionDefinition } from "@w6w/types";
import { DiscordClient } from "../lib/client.ts";

interface Input {
  channelId: string;
}

/**
 * Fetch a single channel by ID.
 *
 * https://discord.com/developers/docs/resources/channel#get-channel
 */
const getChannel: ActionDefinition<Input> = {
  key: "get-channel",
  type: "read",
  resource: "channel",
  title: "Get Channel",
  description: "Retrieve a Discord channel by ID.",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new DiscordClient(ctx);
    return client.request(`/channels/${input.channelId}`);
  },
};

export default getChannel;
