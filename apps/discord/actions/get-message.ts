import type { ActionDefinition } from "@w6w/types";
import { DiscordClient } from "../lib/client.ts";

interface Input {
  channelId: string;
  messageId: string;
}

/**
 * Fetch a single message from a channel.
 *
 * https://discord.com/developers/docs/resources/channel#get-channel-message
 */
const getMessage: ActionDefinition<Input> = {
  key: "get-message",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Retrieve a message from a channel by ID.",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "messageId", label: "Message ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new DiscordClient(ctx);
    return client.request(`/channels/${input.channelId}/messages/${input.messageId}`);
  },
};

export default getMessage;
