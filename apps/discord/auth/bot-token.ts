import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Discord Bot Token (`bearer`) — the "server-side bot" path. You register a
 * Discord Application, add a Bot user, invite it to a guild, and paste the
 * bot token here. Every request signs with `Authorization: Bot <token>` (NOT
 * `Bearer`) — this is Discord-specific and required for bot endpoints like
 * `PUT /guilds/{id}/members/{user}/roles/{role}` that OAuth2 user tokens
 * cannot reach.
 *
 * For the end-user OAuth path (identify / guilds / guilds.members.read) see
 * `./oauth2.ts`.
 */
const botToken: AuthDefinition = {
  key: "bot-token",
  type: "bearer",
  displayName: "Bot Token",
  description:
    "Paste a Bot Token minted at Discord Developer Portal → Applications → your app → Bot → Reset Token.",
  connectionLabel: "{{user.username}}",
  fields: [
    {
      key: "apiKey",
      label: "Bot Token",
      type: "secret",
      required: true,
      hint: "Discord Developer Portal → Applications → Bot → Token.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    // Discord bot auth uses the `Bot <token>` scheme, not `Bearer <token>`.
    request.headers["authorization"] = `Bot ${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    const res = await ctx.fetch(`${API_URL}/users/@me`, {
      headers: { authorization: `Bot ${apiKey}` },
    });
    if (!res.ok) return { ok: false, message: `Discord returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/@me`);
    if (!res.ok) return {};
    const user = await res.json() as {
      id?: string;
      username?: string;
      global_name?: string;
    };
    return {
      user: {
        id: user.id,
        username: user.global_name ?? user.username,
      },
    };
  },
};

export default botToken;
