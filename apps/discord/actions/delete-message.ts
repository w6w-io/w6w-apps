import type { ActionDefinition } from "@w6w/types";
import { DiscordClient } from "../lib/client.ts";

interface Input {
  channelId: string;
  messageId: string;
}

/**
 * Delete a message. Discord returns 204 on success.
 *
 * https://discord.com/developers/docs/resources/channel#delete-message
 */
const deleteMessage: ActionDefinition<Input> = {
  key: "delete-message",
  type: "perform",
  resource: "message",
  title: "Delete Message",
  description: "Delete a message from a channel.",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "messageId", label: "Message ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new DiscordClient(ctx);
    await client.request(
      `/channels/${input.channelId}/messages/${input.messageId}`,
      { method: "DELETE" },
    );
    return { success: true };
  },
};

export default deleteMessage;
