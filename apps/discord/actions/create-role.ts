import type { ActionDefinition } from "@w6w/types";
import { DiscordClient } from "../lib/client.ts";

interface Input {
  guildId: string;
  name?: string;
  /** Bitwise permission integer (as a string — permissions overflow 32-bit). */
  permissions?: string;
  /** RGB color as an integer (e.g. 0xff0000 = 16711680). */
  color?: number;
  hoist?: boolean;
  mentionable?: boolean;
}

/**
 * Create a role in a guild. All fields are optional per Discord's API — with
 * no body, Discord creates a role named "new role" with everyone-level perms.
 *
 * https://discord.com/developers/docs/resources/guild#create-guild-role
 */
const createRole: ActionDefinition<Input> = {
  key: "create-role",
  type: "perform",
  resource: "role",
  title: "Create Role",
  description: "Create a new role in a Discord server.",
  params: [
    { key: "guildId", label: "Server (Guild) ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    {
      key: "permissions",
      label: "Permissions",
      type: "string",
      hint: "Bitwise permission integer as a string.",
    },
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
    return client.request(`/guilds/${input.guildId}/roles`, {
      method: "POST",
      body,
    });
  },
};

export default createRole;
