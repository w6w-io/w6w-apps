import type { ActionDefinition } from "@w6w/types";
import { DiscordClient } from "../lib/client.ts";

interface Input {
  channelId: string;
  limit?: number;
  before?: string;
  after?: string;
  around?: string;
}

/**
 * List messages in a channel. Discord's cursor is message-ID-based: pass the
 * ID of the earliest already-seen message as `before` to walk backwards in
 * time. `limit` maxes at 100 per request.
 *
 * https://discord.com/developers/docs/resources/channel#get-channel-messages
 */
const listMessages: ActionDefinition<Input> = {
  key: "list-messages",
  type: "read",
  resource: "message",
  title: "List Messages",
  description: "List messages in a channel (newest first).",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      hint: "Max 100 per request.",
    },
    { key: "before", label: "Before message ID", type: "string" },
    { key: "after", label: "After message ID", type: "string" },
    { key: "around", label: "Around message ID", type: "string" },
  ],
  output: [
    { key: "messages", type: "array", label: "Messages" },
  ],

  async execute(input, ctx) {
    const client = new DiscordClient(ctx);
    const messages = await client.request<Array<Record<string, unknown>>>(
      `/channels/${input.channelId}/messages`,
      {
        query: {
          limit: input.limit ?? 50,
          before: input.before,
          after: input.after,
          around: input.around,
        },
      },
    );
    return { messages };
  },
};

export default listMessages;
