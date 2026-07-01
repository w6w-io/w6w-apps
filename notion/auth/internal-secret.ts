import type { AuthDefinition } from "@w6w/types";
import { API_URL, NOTION_VERSION } from "../lib/client.ts";

/**
 * Internal Integration Secret (`bearer`) — the "internal integration" path.
 * You register an internal integration under a Notion workspace, paste its
 * secret here, and every request signs with it. Suitable for a single
 * workspace / private use — the public integrator path lives in ./oauth2.ts.
 *
 * Notion doesn't have a "me" endpoint that reveals the acting user, but
 * /users/me returns the bot user tied to the integration — good enough for
 * both credential-test and a connection label.
 */
const internalSecret: AuthDefinition = {
  key: "internal-secret",
  type: "bearer",
  displayName: "Internal Integration Secret",
  description:
    "Paste the secret from an internal integration at Settings & members -> Integrations -> Develop your own integrations.",
  connectionLabel: "{{bot.name}}",
  fields: [
    {
      key: "apiKey",
      label: "Internal Integration Secret",
      type: "secret",
      required: true,
      hint: "Notion Settings -> Integrations -> Develop your own integrations -> Internal Integration Secret.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    // Notion rejects requests without a Notion-Version. The client sets it
    // for outbound API calls, but the sign hook runs for arbitrary requests
    // (including the runtime's own probes), so make sure it's always there.
    if (!request.headers["notion-version"] && !request.headers["Notion-Version"]) {
      request.headers["Notion-Version"] = NOTION_VERSION;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: {
        authorization: `Bearer ${apiKey}`,
        "Notion-Version": NOTION_VERSION,
      },
    });
    if (!res.ok) return { ok: false, message: `Notion returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: { "Notion-Version": NOTION_VERSION },
    });
    if (!res.ok) return {};
    const bot = await res.json() as {
      id?: string;
      name?: string;
      bot?: { workspace_name?: string };
    };
    return {
      bot: {
        id: bot.id,
        name: bot.name,
        workspace: bot.bot?.workspace_name,
      },
    };
  },
};

export default internalSecret;
