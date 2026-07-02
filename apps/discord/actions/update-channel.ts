import type { ActionDefinition } from "@w6w/types";
import { DiscordClient } from "../lib/client.ts";

interface Input {
  channelId: string;
  name?: string;
  topic?: string;
  bitrate?: number;
  userLimit?: number;
  parentId?: string;
  position?: number;
  rateLimitPerUser?: number;
  nsfw?: boolean;
}

/**
 * Update (`PATCH`) a channel. Only fields explicitly supplied are forwarded so
 * a caller can, e.g., rename a channel without touching its position.
 *
 * https://discord.com/developers/docs/resources/channel#modify-channel
 */
const updateChannel: ActionDefinition<Input> = {
  key: "update-channel",
  type: "perform",
  resource: "channel",
  title: "Update Channel",
  description: "Update a Discord channel.",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "topic", label: "Topic", type: "text" },
    { key: "bitrate", label: "Bitrate", type: "number" },
    { key: "userLimit", label: "User Limit", type: "number" },
    { key: "parentId", label: "Parent Category ID", type: "string" },
    { key: "position", label: "Position", type: "number" },
    { key: "rateLimitPerUser", label: "Rate Limit (seconds/user)", type: "number" },
    { key: "nsfw", label: "Age-restricted (NSFW)", type: "boolean" },
  ],

  async execute(input, ctx) {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.topic !== undefined) body.topic = input.topic;
    if (input.bitrate !== undefined) body.bitrate = input.bitrate;
    if (input.userLimit !== undefined) body.user_limit = input.userLimit;
    if (input.parentId !== undefined) body.parent_id = input.parentId;
    if (input.position !== undefined) body.position = input.position;
    if (input.rateLimitPerUser !== undefined) body.rate_limit_per_user = input.rateLimitPerUser;
    if (input.nsfw !== undefined) body.nsfw = input.nsfw;

    const client = new DiscordClient(ctx);
    return client.request(`/channels/${input.channelId}`, {
      method: "PATCH",
      body,
    });
  },
};

export default updateChannel;
