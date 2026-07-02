import type { ActionDefinition } from "@w6w/types";
import { DiscordClient } from "../lib/client.ts";

interface Input {
  guildId: string;
  name: string;
  /** Discord channel type: 0 text, 2 voice, 4 category. See discord docs. */
  type?: number;
  topic?: string;
  bitrate?: number;
  userLimit?: number;
  parentId?: string;
  position?: number;
  rateLimitPerUser?: number;
  nsfw?: boolean;
}

/**
 * Create a new channel in a guild.
 *
 * https://discord.com/developers/docs/resources/guild#create-guild-channel
 */
const createChannel: ActionDefinition<Input> = {
  key: "create-channel",
  type: "perform",
  resource: "channel",
  title: "Create Channel",
  description: "Create a channel in a Discord server.",
  params: [
    { key: "guildId", label: "Server (Guild) ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      default: 0,
      options: [
        { value: 0, label: "Guild Text" },
        { value: 2, label: "Guild Voice" },
        { value: 4, label: "Guild Category" },
      ],
    },
    { key: "topic", label: "Topic", type: "text" },
    { key: "bitrate", label: "Bitrate (voice only)", type: "number" },
    { key: "userLimit", label: "User Limit (voice only)", type: "number" },
    { key: "parentId", label: "Parent Category ID", type: "string" },
    { key: "position", label: "Position", type: "number" },
    {
      key: "rateLimitPerUser",
      label: "Rate Limit (seconds/user)",
      type: "number",
    },
    { key: "nsfw", label: "Age-restricted (NSFW)", type: "boolean" },
  ],

  async execute(input, ctx) {
    const body: Record<string, unknown> = {
      name: input.name,
      type: input.type ?? 0,
    };
    if (input.topic !== undefined) body.topic = input.topic;
    if (input.bitrate !== undefined) body.bitrate = input.bitrate;
    if (input.userLimit !== undefined) body.user_limit = input.userLimit;
    if (input.parentId !== undefined) body.parent_id = input.parentId;
    if (input.position !== undefined) body.position = input.position;
    if (input.rateLimitPerUser !== undefined) body.rate_limit_per_user = input.rateLimitPerUser;
    if (input.nsfw !== undefined) body.nsfw = input.nsfw;

    const client = new DiscordClient(ctx);
    return client.request(`/guilds/${input.guildId}/channels`, {
      method: "POST",
      body,
    });
  },
};

export default createChannel;
