import type { ActionDefinition } from "@w6w/types";
import { DiscordClient } from "../lib/client.ts";

interface Input {
  channelId: string;
}

/**
 * Delete a channel. Discord returns the deleted channel object on success.
 *
 * https://discord.com/developers/docs/resources/channel#deleteclose-channel
 */
const deleteChannel: ActionDefinition<Input> = {
  key: "delete-channel",
  type: "perform",
  resource: "channel",
  title: "Delete Channel",
  description: "Delete a Discord channel.",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new DiscordClient(ctx);
    return client.request(`/channels/${input.channelId}`, { method: "DELETE" });
  },
};

export default deleteChannel;
