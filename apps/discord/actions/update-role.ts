import type { ActionDefinition } from "@w6w/types";
import { DiscordClient } from "../lib/client.ts";

interface Input {
  guildId: string;
  roleId: string;
  name?: string;
  permissions?: string;
  color?: number;
  hoist?: boolean;
  mentionable?: boolean;
}

/**
 * Update a role. Only fields explicitly supplied are forwarded.
 *
 * https://discord.com/developers/docs/resources/guild#modify-guild-role
 */
const updateRole: ActionDefinition<Input> = {
  key: "update-role",
  type: "perform",
  resource: "role",
  title: "Update Role",
  description: "Update a role in a Discord server.",
  params: [
    { key: "guildId", label: "Server (Guild) ID", type: "string", required: true },
    { key: "roleId", label: "Role ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "permissions", label: "Permissions", type: "string" },
    { key: "color", label: "Color (RGB integer)", type: "number" },
    { key: "hoist", label: "Show separately in sidebar", type: "boolean" },
    { key: "mentionable", label: "Mentionable", type: "boolean" },
  ],

  async execute(input, ctx) {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.permissions !== undefined) body.permissions = input.permissions;
    if (input.color !== undefined) body.color = input.color;
    if (input.hoist !== undefined) body.hoist = input.hoist;
    if (input.mentionable !== undefined) body.mentionable = input.mentionable;

    const client = new DiscordClient(ctx);
    return client.request(`/guilds/${input.guildId}/roles/${input.roleId}`, {
      method: "PATCH",
      body,
    });
  },
};

export default updateRole;
