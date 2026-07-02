import type { ActionDefinition } from "@w6w/types";
import { DiscordClient } from "../lib/client.ts";

interface Input {
  guildId: string;
  withCounts?: boolean;
}

/**
 * Fetch a single guild by ID.
 *
 * https://discord.com/developers/docs/resources/guild#get-guild
 */
const getGuild: ActionDefinition<Input> = {
  key: "get-guild",
  type: "read",
  resource: "guild",
  title: "Get Guild",
  description: "Retrieve a Discord server (guild) by ID.",
  params: [
    { key: "guildId", label: "Server (Guild) ID", type: "string", required: true },
    {
      key: "withCounts",
      label: "Include member counts",
      type: "boolean",
      hint: "Includes `approximate_member_count` and `approximate_presence_count`.",
    },
  ],

  async execute(input, ctx) {
    const client = new DiscordClient(ctx);
    return client.request(`/guilds/${input.guildId}`, {
      query: { with_counts: input.withCounts },
    });
  },
};

export default getGuild;
