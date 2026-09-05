import type { AuthDefinition } from "@w6w/types";
import { API_URL, firstErrorMessage } from "../lib/client.ts";

/**
 * OAuth 2.0 (Authorization Code) against a Lawmatics Developer App.
 *
 * Confirmed against the vendor's own "Getting Started With Auth" page inside
 * its Postman collection (docs.lawmatics.com, 2026-09-05):
 *
 *   - The authorize screen is `https://app.lawmatics.com/oauth/authorize`
 *     (`client_id`, `redirect_uri`, `response_type=code`, optional `state`) —
 *     on `app.lawmatics.com`, NOT the API host, and allowed implicitly as an
 *     OAuth endpoint host.
 *   - The token exchange is `POST https://api.lawmatics.com/oauth/token` with
 *     `client_id`, `client_secret`, `grant_type=authorization_code`, `code`,
 *     `redirect_uri` — the classic confidential-client shape. Nothing in the
 *     docs mentions `code_challenge`/`code_verifier`, so PKCE is left off
 *     rather than guessed at.
 *   - The response is `{"token_type": "bearer", "access_token": "...",
 *     "created_at": <unix ts>}` — no `expires_in`, no `refresh_token`.
 *   - **The vendor states the access token never expires** ("We do not give
 *     you a refresh token. Access tokens do not expire so they are not
 *     needed.") — there is deliberately no `refresh` hook here.
 *   - **There is no deauthorization endpoint** ("We do not have a
 *     deauthorization endpoint.") — there is deliberately no `revoke` hook;
 *     disconnecting here only forgets the local Connection.
 *   - **No scopes exist** ("We currently do not support scopes. Once a user
 *     authenticates your app, they are giving you full CRUD access to their
 *     account.") — `oauth2.scopes` is omitted rather than invented.
 *   - A firm-wide rate limit of 50 req/min applies; an exceeded limit answers
 *     429 with a `Retry-After: 60` header (see `health/quota.ts` for why that
 *     can't be turned into a proactive headroom check).
 *
 * `api.lawmatics.com` is a single, fixed, shared host across every customer —
 * there is no per-tenant subdomain to resolve, unlike Workday/NetSuite/
 * ServiceTitan-shaped APIs.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Lawmatics)",
  description:
    "Authorize a Lawmatics Developer App (Settings → Developers in a Lawmatics account) to act " +
    "on a firm's behalf. Lawmatics grants full CRUD access with no scopes to choose.",
  connectionLabel: "{{name}} ({{email}})",
  oauth2: {
    authorizationUrl: "https://app.lawmatics.com/oauth/authorize",
    tokenUrl: "https://api.lawmatics.com/oauth/token",
    // Classic client_secret exchange; the docs describe no code_challenge/
    // code_verifier step, so PKCE is left off rather than assumed.
    pkce: false,
    // Lawmatics documents no scopes at all — see module doc above.
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken?: string };
    if (accessToken) request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /v1/users/me` — the one endpoint that needs no scope (there are
   * none) and returns nothing but the connected user's own profile:
   * `{"data":{"id","type":"user","attributes":{"name","email","created_at",
   * "updated_at"}}}` (a live example in the collection). It never echoes the
   * credential itself, unlike Follow Up Boss's `/me` or Mailjet's `/apikey`.
   *
   * A failed credential is classified from the vendor's own error body
   * (`{"errors":[{"status","title","detail"}]}`), never from the bare HTTP
   * status alone.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, message: firstErrorMessage(text) ?? `Lawmatics returned ${res.status}` };
    }
    const body = JSON.parse(text || "{}") as { data?: { type?: string } };
    if (body.data?.type !== "user") {
      return { ok: false, message: "unexpected response from /v1/users/me" };
    }
    return { ok: true };
  },

  /**
   * Reads the same `/v1/users/me` profile to label the Connection. Signs the
   * request by hand — `sign` only wires into an Action's outbound request;
   * every other Auth lifecycle hook talks to `ctx.fetch` directly.
   */
  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return {};

    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      data?: { attributes?: { name?: string; email?: string } };
    };
    return { name: body.data?.attributes?.name, email: body.data?.attributes?.email };
  },
};

export default oauth2;
