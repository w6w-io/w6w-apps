import type { ActionDefinition } from "@w6w/types";
import { DiscordClient } from "../lib/client.ts";

interface Input {
  guildId: string;
  roleId: string;
}

/**
 * Delete a role. Discord returns 204 on success.
 *
 * https://discord.com/developers/docs/resources/guild#delete-guild-role
 */
const deleteRole: ActionDefinition<Input> = {
  key: "delete-role",
  type: "perform",
  resource: "role",
  title: "Delete Role",
  description: "Delete a role from a Discord server.",
  params: [
    { key: "guildId", label: "Server (Guild) ID", type: "string", required: true },
    { key: "roleId", label: "Role ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new DiscordClient(ctx);
    await client.request(`/guilds/${input.guildId}/roles/${input.roleId}`, {
      method: "DELETE",
    });
    return { success: true };
  },
};

export default deleteRole;
