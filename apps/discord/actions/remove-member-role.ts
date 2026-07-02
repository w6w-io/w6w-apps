import type { ActionDefinition } from "@w6w/types";
import { DiscordClient } from "../lib/client.ts";

interface Input {
  guildId: string;
  userId: string;
  roleId: string;
}

/**
 * Remove a single role from a guild member. See `add-member-role` — Discord's
 * endpoint is one-role-per-call.
 *
 * https://discord.com/developers/docs/resources/guild#remove-guild-member-role
 */
const removeMemberRole: ActionDefinition<Input> = {
  key: "remove-member-role",
  type: "perform",
  resource: "member",
  title: "Remove Role from Member",
  description: "Remove a role from a guild member.",
  params: [
    { key: "guildId", label: "Server (Guild) ID", type: "string", required: true },
    { key: "userId", label: "User ID", type: "string", required: true },
    { key: "roleId", label: "Role ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new DiscordClient(ctx);
    await client.request(
      `/guilds/${input.guildId}/members/${input.userId}/roles/${input.roleId}`,
      { method: "DELETE" },
    );
    return { success: true };
  },
};

export default removeMemberRole;
