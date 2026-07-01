import type { AuthDefinition } from "@w6w/types";
import { API_URL, NOTION_VERSION } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — the "public integrator" path. Register a public
 * integration on Notion, wire its client_id / client_secret / redirect_uri to
 * the w6w server via PUT /apps/:id/oauth-config/oauth2, and users then
 * connect via the browser authorization dance.
 *
 * Notion specifics:
 *   - No PKCE support (pkce=false).
 *   - Token response is JSON and includes `access_token`, `workspace_id`,
 *     `workspace_name`, `workspace_icon`, `bot_id`, and `owner`. We capture
 *     those in `afterConnect` so downstream label/context is meaningful.
 *   - Tokens don't expire — no refresh hook needed.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Notion)",
  description:
    "Public OAuth flow. Requires a Notion public integration (client_id / client_secret / redirect_uri) configured on this w6w installation.",
  connectionLabel: "{{workspace.name}} ({{bot.name}})",
  oauth2: {
    authorizationUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    // Notion doesn't advertise PKCE; keep it off explicitly so we don't
    // accidentally enable it if defaults ever change.
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    if (!request.headers["notion-version"] && !request.headers["Notion-Version"]) {
      request.headers["Notion-Version"] = NOTION_VERSION;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
        "Notion-Version": NOTION_VERSION,
      },
    });
    if (!res.ok) return { ok: false, message: `Notion returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(input, ctx) {
    // The exchange hook stashes the raw token-response fields on the credential —
    // we pull the ones useful for the connection label. Falls back to /users/me
    // when workspace metadata wasn't captured (older exchange responses).
    const cred = (input.credential ?? {}) as {
      workspaceId?: string;
      workspaceName?: string;
      workspaceIcon?: string;
      botId?: string;
    };

    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: { "Notion-Version": NOTION_VERSION },
    });
    const bot = res.ok
      ? await res.json() as {
        id?: string;
        name?: string;
        bot?: { workspace_name?: string };
      }
      : { id: cred.botId, name: undefined, bot: { workspace_name: cred.workspaceName } };

    return {
      workspace: {
        id: cred.workspaceId,
        name: cred.workspaceName ?? bot.bot?.workspace_name,
        icon: cred.workspaceIcon,
      },
      bot: {
        id: cred.botId ?? bot.id,
        name: bot.name,
      },
    };
  },
};

export default oauth2;
