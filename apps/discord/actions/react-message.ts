import type { ActionDefinition } from "@w6w/types";
import { DiscordClient } from "../lib/client.ts";

interface Input {
  channelId: string;
  messageId: string;
  /**
   * The emoji to react with. Unicode emoji: pass the character directly (e.g.
   * `👍`). Custom guild emoji: pass `name:id`. The endpoint URL-encodes the
   * value — no encoding required from the caller.
   */
  emoji: string;
}

/**
 * React to a message as the current bot user (`@me`). Discord returns 204.
 *
 * https://discord.com/developers/docs/resources/channel#create-reaction
 */
const reactMessage: ActionDefinition<Input> = {
  key: "react-message",
  type: "perform",
  resource: "message",
  title: "React to Message",
  description: "Add a reaction to a message as the current user.",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "messageId", label: "Message ID", type: "string", required: true },
    {
      key: "emoji",
      label: "Emoji",
      type: "string",
      required: true,
      hint: "Unicode character (e.g. 👍) or `name:id` for a custom guild emoji.",
    },
  ],

  async execute(input, ctx) {
    const client = new DiscordClient(ctx);
    await client.request(
      `/channels/${input.channelId}/messages/${input.messageId}/reactions/${
        encodeURIComponent(input.emoji)
      }/@me`,
      { method: "PUT" },
    );
    return { success: true };
  },
};

export default reactMessage;
