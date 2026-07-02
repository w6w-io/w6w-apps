import type { ActionDefinition } from "@w6w/types";
import { DiscordClient } from "../lib/client.ts";

interface Input {
  guildId: string;
  userId: string;
  roleId: string;
}

/**
 * Assign a single role to a guild member. Discord's endpoint operates on one
 * role at a time — n8n's UI presents a multi-select and loops; here we keep
 * it one-role-per-call and let callers loop upstream.
 *
 * https://discord.com/developers/docs/resources/guild#add-guild-member-role
 */
const addMemberRole: ActionDefinition<Input> = {
  key: "add-member-role",
  type: "perform",
  resource: "member",
  title: "Add Role to Member",
  description: "Add a role to a guild member.",
  params: [
    { key: "guildId", label: "Server (Guild) ID", type: "string", required: true },
    { key: "userId", label: "User ID", type: "string", required: true },
    { key: "roleId", label: "Role ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new DiscordClient(ctx);
    await client.request(
      `/guilds/${input.guildId}/members/${input.userId}/roles/${input.roleId}`,
      { method: "PUT" },
    );
    return { success: true };
  },
};

export default addMemberRole;
