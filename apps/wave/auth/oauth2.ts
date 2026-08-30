import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 authorization code — Wave's documented flow for any application
 * "published or sold for other Wave users to access their accounts."
 *
 * Confirmed against Wave's own "OAuth Guide" and "3 - Authentication" articles
 * (developer.waveapps.com), not assumed:
 *
 *   - Authorize: `GET https://api.waveapps.com/oauth2/authorize/`
 *   - Token exchange / refresh: `POST https://api.waveapps.com/oauth2/token/`
 *   - Revoke: `POST https://api.waveapps.com/oauth2/token-revoke/`
 *
 * These are on `api.waveapps.com`, a different host from the GraphQL endpoint
 * (`gql.waveapps.com`) this app calls at runtime — OAuth endpoint hosts are
 * allowed implicitly, so neither needs to be in `w6w.network.allow`.
 *
 * ## Scopes
 *
 * Wave scopes a token per resource with an explicit `resource:operation`
 * grammar ("OAuth Scopes" article) — `write` does NOT imply `read`, and there
 * is no bare `invoice` scope, only `invoice:read` / `invoice:write` /
 * `invoice:send` / `invoice:*`. The list below is the narrowest set that
 * covers every action in this app: read + write on the objects this app
 * mutates, read-only on the ones it only reports (account, business, user),
 * and `transaction:write` because Wave documents NO `transaction:read` scope
 * at all — money-transaction-create is genuinely write-only from Wave's side.
 *
 * ## Business scoping
 *
 * "Users can only grant access to businesses that have an active Pro or Wave
 * Advisor subscription with Wave" — a free-tier Wave account cannot complete
 * this flow at all, only the full-access-token path below.
 *
 * ## PKCE and token lifetimes
 *
 * `pkce: true` — Wave's flow accepts `code_challenge`/`code_challenge_method`
 * per the guide, and PKCE is this field's own default; set explicitly to pin
 * it in code. Tokens expire after the vendor's own `expires_in` (returned per
 * exchange, not a fixed constant Wave documents) and are renewed with
 * `grant_type=refresh_token` against the same token endpoint — refresh
 * rotates the refresh token itself, per the guide's "the previous access_token
 * is invalidated" note, so `refreshUrl` is left unset and defaults to
 * `tokenUrl`. A refresh also fails with HTTP 403 if the business's Pro/Wave
 * Advisor subscription has lapsed since the grant.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Wave)",
  description:
    "Authorize a Wave account. The connected business must have an active Pro or Wave Advisor subscription — Wave does not permit OAuth access to a free-tier business.",
  connectionLabel: "{{user.defaultEmail}}",
  oauth2: {
    authorizationUrl: "https://api.waveapps.com/oauth2/authorize/",
    tokenUrl: "https://api.waveapps.com/oauth2/token/",
    revokeUrl: "https://api.waveapps.com/oauth2/token-revoke/",
    scopes: [
      "user:read",
      "business:read",
      "customer:read",
      "customer:write",
      "product:read",
      "product:write",
      "account:read",
      "invoice:read",
      "invoice:write",
      "invoice:send",
      "estimate:read",
      "estimate:write",
      "estimate:send",
      "transaction:write",
    ],
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `{ user { id defaultEmail } }` — the exact probe Wave's own docs use to
   * demonstrate a working credential ("3 - Authentication", "Clients").
   *
   * Checked on both channels: an expired/garbage token can answer HTTP 401,
   * but Wave's documented failure mode for "Login Required" is HTTP 200 with
   * `errors: [{ extensions: { code: "UNAUTHENTICATED" } }]` and
   * `data: { user: null }` — so `res.ok` alone is not sufficient.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ query: "{ user { id defaultEmail } }" }),
    });

    const body = await res.json().catch(() => ({})) as {
      data?: { user?: { id?: string } | null };
      errors?: Array<{ message?: string }>;
    };
    if (body.errors?.length) {
      return { ok: false, message: body.errors[0]?.message ?? "Wave rejected the credential" };
    }
    if (!res.ok) return { ok: false, message: `Wave returned ${res.status}` };
    if (!body.data?.user?.id) return { ok: false, message: "Wave returned no user" };
    return { ok: true };
  },

  /**
   * Label the Connection with the account's own email, so a workflow author
   * picking a Connection sees who it belongs to rather than an opaque id.
   * This hook does not read the credential — the runtime routes it through
   * `sign` — which is why there is no `authorization` header here.
   */
  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        query: "{ user { id firstName lastName defaultEmail } }",
      }),
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      data?: { user?: unknown };
      errors?: unknown[];
    };
    if (body.errors?.length || !body.data?.user) return {};
    return { user: body.data.user };
  },
};

export default oauth2;
