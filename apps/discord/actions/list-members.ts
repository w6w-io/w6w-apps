import type { ActionDefinition } from "@w6w/types";
import { DiscordClient } from "../lib/client.ts";

interface Input {
  guildId: string;
  limit?: number;
  /** User ID to paginate after (server-side cursor). */
  after?: string;
}

/**
 * List members of a guild. Discord's cursor is user-ID-based: pass the ID of
 * the last member you already have as `after` to walk forward. `limit` maxes
 * at 1000 per request.
 *
 * Requires the GUILD_MEMBERS privileged intent for a bot, or the
 * `guilds.members.read` OAuth2 scope for a user token.
 *
 * https://discord.com/developers/docs/resources/guild#list-guild-members
 */
const listMembers: ActionDefinition<Input> = {
  key: "list-members",
  type: "read",
  resource: "member",
  title: "List Members",
  description: "List members of a Discord server.",
  params: [
    { key: "guildId", label: "Server (Guild) ID", type: "string", required: true },
    { key: "limit", label: "Limit", type: "number", default: 100, hint: "Max 1000." },
    { key: "after", label: "After user ID", type: "string" },
  ],
  output: [
    { key: "members", type: "array", label: "Members" },
  ],

  async execute(input, ctx) {
    const client = new DiscordClient(ctx);
    const members = await client.request<Array<Record<string, unknown>>>(
      `/guilds/${input.guildId}/members`,
      {
        query: {
          limit: input.limit ?? 100,
          after: input.after,
        },
      },
    );
    return { members };
  },
};

export default listMembers;
