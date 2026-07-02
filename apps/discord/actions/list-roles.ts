import type { ActionDefinition } from "@w6w/types";
import { DiscordClient } from "../lib/client.ts";

interface Input {
  guildId: string;
}

/**
 * List roles in a guild.
 *
 * https://discord.com/developers/docs/resources/guild#get-guild-roles
 */
const listRoles: ActionDefinition<Input> = {
  key: "list-roles",
  type: "read",
  resource: "role",
  title: "List Roles",
  description: "List roles defined in a Discord server.",
  params: [
    { key: "guildId", label: "Server (Guild) ID", type: "string", required: true },
  ],
  output: [
    { key: "roles", type: "array", label: "Roles" },
  ],

  async execute(input, ctx) {
    const client = new DiscordClient(ctx);
    const roles = await client.request<Array<Record<string, unknown>>>(
      `/guilds/${input.guildId}/roles`,
    );
    return { roles };
  },
};

export default listRoles;
