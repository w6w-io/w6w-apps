import type { AuthDefinition } from "@w6w/types";
import { API_VERSION, GrainClient } from "../lib/client.ts";

/**
 * API Key (`apiKey`, header-located) — a Grain **Personal Access Token** or
 * **Workspace Access Token**, both sent identically as
 * `Authorization: Bearer TOKEN`.
 *
 * Grain distinguishes the two only by scope, not by wire format (docs,
 * "Authentication" section):
 *
 *   - **Personal Access Token** — "same level of access as the user that
 *     generated the token". Some params are documented "*Personal API Only"
 *     (the `attendance` recording filter, `private_notes` include) and only
 *     resolve meaningfully with one of these.
 *   - **Workspace Access Token** — "access to ALL DATA from your workspace".
 *     Required for `user_id` on Generate Upload URL ("**Workspace API
 *     Only**, required").
 *
 * Both are minted at `https://grain.com/app/settings/integrations?tab=api`.
 * There is no query-param form and no per-tenant host.
 *
 * ## Why OAuth2 is not offered here
 *
 * Grain's docs also describe a full OAuth2 Authorization Code + PKCE flow
 * (`GET https://grain.com/_/public-api/oauth2/authorize`,
 * `POST https://api.grain.com/_/public-api/oauth2/token`), and it is
 * deliberately NOT implemented, for a concrete reason rather than caution
 * for its own sake:
 *
 * Grain's own example requests for BOTH "Generate Token" and "Refresh Token"
 * send `Content-Type: application/json` with a JSON body
 * (`{"grant_type": "authorization_code", "code": ..., "client_id": ...}`) —
 * not the `application/x-www-form-urlencoded` body RFC 6749 (and every other
 * OAuth2 app in this pack) uses. Whether this platform's generic `oauth2`
 * token exchange sends JSON or form-encoded is a host implementation detail
 * this app cannot see or override without declaring a custom `exchange` /
 * `refresh` hook — and getting that wrong would silently mint a token
 * request Grain rejects. Rather than guess at the host's default and risk a
 * flow that fails on every connect attempt, this app ships only the
 * documented-and-unambiguous bearer-token form. A Personal or Workspace
 * Access Token already covers everything an OAuth2 connection would
 * (Workspace tokens exceed it, seeing the whole workspace rather than one
 * user), so nothing is lost for this app's coverage.
 *
 * ## No `afterConnect`
 *
 * Grain publishes no whoami endpoint for either token type — there is no
 * `/me` and `List Users` returns the whole workspace roster (or 403s for a
 * Personal token without workspace-admin visibility), not "the current
 * user". Rather than label a Connection from an arbitrary roster entry,
 * nothing is recorded and no `connectionLabel` is declared.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste a Personal Access Token or Workspace Access Token from Grain -> Settings -> " +
    "Integrations -> API. Sent as the `Authorization: Bearer` header on every request.",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "token",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "grain.com/app/settings/integrations?tab=api — a Personal Access Token (your own " +
        "access) or a Workspace Access Token (the whole workspace).",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  /**
   * `POST /_/public-api/v2/teams` — the cheapest documented call: no
   * required params, no filter object, and a workspace's team list is
   * typically small, unlike `List Users` (which can be a long roster) or
   * `List Recordings` (which needs no body but returns meeting content).
   * Both Personal and Workspace tokens can reach it per the docs (`teams`
   * carries no *Personal/Workspace-only annotation, unlike `attendance` or
   * `private_notes`).
   */
  async test({ credential }, ctx) {
    const { token } = credential as { token?: string };
    if (!token) return { ok: false, message: "credential missing token" };

    const res = await ctx.fetch(GrainClient.url("/v2/teams"), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "public-api-version": API_VERSION,
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    if (res.ok) return { ok: true };

    const text = await res.text().catch(() => "");
    return {
      ok: false,
      message: text
        ? `Grain returned HTTP ${res.status}: ${text.slice(0, 200)}`
        : `Grain returned HTTP ${res.status}`,
    };
  },
};

export default apiKey;
