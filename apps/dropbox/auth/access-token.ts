import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Access Token (`bearer`) — the "internal / individual user" path. You mint a
 * personal access token from a Dropbox App under the App Console (Settings tab
 * -> OAuth 2 -> Generated access token) and paste it here; every request signs
 * with `Authorization: Bearer <token>`. No browser dance, no client secrets.
 *
 * For the "public integrator" path (browser OAuth flow, one Dropbox app,
 * many end users, refresh tokens) see `./oauth2.ts`.
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Access Token",
  description:
    "Paste a personal access token generated in the Dropbox App Console (Settings -> OAuth 2 -> Generated access token).",
  connectionLabel: "{{user.name}} ({{user.email}})",
  fields: [
    {
      key: "apiKey",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Dropbox App Console -> your app -> Settings -> OAuth 2 -> Generated access token.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    // Dropbox's /users/get_current_account is POST-only with a `null` body —
    // one of its quirks. Every valid token can hit it.
    const res = await ctx.fetch(`${API_URL}/users/get_current_account`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { ok: false, message: `Dropbox returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/get_current_account`, {
      method: "POST",
    });
    if (!res.ok) return {};
    const account = await res.json() as {
      account_id?: string;
      name?: { display_name?: string };
      email?: string;
    };
    return {
      user: {
        id: account.account_id,
        name: account.name?.display_name,
        email: account.email,
      },
    };
  },
};

export default accessToken;
