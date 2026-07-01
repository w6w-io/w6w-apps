import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 with Facebook for Business. You register a Facebook App in the
 * Meta for Developers console, add "Facebook Login" + "Webhooks" products,
 * and store the resulting `client_id` + `client_secret` + `redirect_uri` on
 * the w6w server via PUT /apps/:id/oauth-config/oauth2. End users then
 * connect via the browser authorization dance and consent to the scopes below.
 *
 * Scopes mirror n8n's `FacebookLeadAdsOAuth2Api` credential:
 *   - `leads_retrieval`   — read leads from `/{form_id}/leads`.
 *   - `ads_management`    — needed to read ad/adset context on the lead.
 *   - `pages_manage_ads`  — required alongside `leads_retrieval` for lead access.
 *   - `pages_read_engagement` — read Page-level metadata (form list).
 *   - `pages_show_list`   — enumerate Pages the user manages (for `list-forms`).
 *
 * Facebook supports PKCE on its OAuth server, so we leave `pkce` at the type
 * default (true). Access tokens are user-level; page-level operations require
 * exchanging for a page access token (see `list-forms` / `list-recent-leads`).
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Facebook)",
  description:
    "Public OAuth flow. Requires a Facebook App registration (client_id / client_secret / redirect_uri) configured on this w6w installation.",
  connectionLabel: "{{user.name}} ({{user.id}})",
  oauth2: {
    authorizationUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scopes: [
      "ads_management",
      "leads_retrieval",
      "pages_manage_ads",
      "pages_read_engagement",
      "pages_show_list",
    ],
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Facebook returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me?fields=id,name`);
    if (!res.ok) return {};
    const user = await res.json() as { id?: string; name?: string };
    return { user: { id: user.id, name: user.name } };
  },
};

export default oauth2;
