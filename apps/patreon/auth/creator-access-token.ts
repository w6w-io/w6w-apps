import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Creator's Access Token (`bearer`) — the "single creator" path. Registering
 * any Client on the Clients & API Keys page also mints a "Creator's Access
 * Token" (plus a "Creator's Refresh Token") scoped to the creator account
 * that registered the client — per docs.patreon.com: "Looking to dive in to
 * the API? You can use your Creator's Access Token you get when registering a
 * Client in place of the token you'd get back from the OAuth flow to start
 * exploring the different endpoints or building a single creator application
 * or tool." It also states the token "will automatically have all V2 scopes
 * associated with it" — so it needs no scope configuration.
 *
 * This is the better fit for a workflow that manages ONE creator's own
 * campaign (the common case for this app pack): no redirect_uri, no browser
 * dance, no per-installation OAuth Client registration on the w6w server —
 * paste the token and go. For a multi-creator "sign in with Patreon" flow use
 * `./oauth2.ts` instead.
 */
const creatorAccessToken: AuthDefinition = {
  key: "creator-access-token",
  type: "bearer",
  displayName: "Creator's Access Token",
  description: "Paste the Creator's Access Token minted when you registered a Client at " +
    "patreon.com/portal/registration/register-clients. Scoped to your own campaign; " +
    "carries every v2 scope automatically.",
  connectionLabel: "{{user.full_name}}",
  fields: [
    {
      key: "apiKey",
      label: "Creator's Access Token",
      type: "secret",
      required: true,
      hint: "Clients & API Keys page → your Client → Creator's Access Token.",
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
    const res = await ctx.fetch(`${API_URL}/identity`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => undefined) as
        | { errors?: Array<{ detail?: string; title?: string }> }
        | undefined;
      const detail = body?.errors?.[0]?.detail ?? body?.errors?.[0]?.title;
      return {
        ok: false,
        message: detail ? `Patreon: ${detail}` : `Patreon returned ${res.status}`,
      };
    }
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/identity?fields%5Buser%5D=full_name,email`);
    if (!res.ok) return {};
    const body = await res.json() as {
      data?: { id?: string; attributes?: { full_name?: string; email?: string } };
    };
    const user = body.data?.attributes ?? {};
    return {
      user: {
        id: body.data?.id,
        full_name: user.full_name,
        email: user.email,
      },
    };
  },
};

export default creatorAccessToken;
