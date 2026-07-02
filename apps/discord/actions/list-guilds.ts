import type { ActionDefinition } from "@w6w/types";
import { DiscordClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  before?: string;
  after?: string;
}

/**
 * List guilds the current user is a member of. Under a Bot Token this
 * returns the guilds the bot is in; under an OAuth2 user token with the
 * `guilds` scope this returns the user's guilds.
 *
 * https://discord.com/developers/docs/resources/user#get-current-user-guilds
 */
const listGuilds: ActionDefinition<Input> = {
  key: "list-guilds",
  type: "read",
  resource: "guild",
  title: "List Guilds",
  description: "List servers (guilds) the current user or bot is a member of.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 100, hint: "Max 200." },
    { key: "before", label: "Before guild ID", type: "string" },
    { key: "after", label: "After guild ID", type: "string" },
  ],
  output: [
    { key: "guilds", type: "array", label: "Guilds" },
  ],

  async execute(input, ctx) {
    const client = new DiscordClient(ctx);
    const guilds = await client.request<Array<Record<string, unknown>>>(
      `/users/@me/guilds`,
      {
        query: {
          limit: input.limit ?? 100,
          before: input.before,
          after: input.after,
        },
      },
    );
    return { guilds };
  },
};

export default listGuilds;
