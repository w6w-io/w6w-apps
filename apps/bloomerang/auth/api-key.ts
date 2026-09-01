import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Bloomerang private-key auth: sent as `X-API-KEY: <key>`, no prefix.
 *
 * ## Confirmed against the vendor's own OpenAPI document
 *
 * Bloomerang's REST API v2 OpenAPI spec (see `lib/client.ts` for the URL)
 * declares exactly one non-OAuth security scheme:
 *
 *   `"ApiKeyAuth": { "type": "apiKey", "in": "header", "name": "X-API-KEY" }`
 *
 * — a plain header, unprefixed, no encoding. This was verified live
 * (2026-09-01): omitting the header entirely gets
 * `{"Message":"Missing Authorization Header","ErrorCode":110}`, and sending a
 * garbage value in `X-API-KEY` gets `{"Message":"Invalid Credentials",
 * "ErrorCode":109}` — both real Bloomerang error bodies, not a generic gateway
 * response, which confirms this is the live auth path on the real host.
 *
 * The docs page itself calls this a **private key**: "The REST API is a
 * private key API. It is for server-to-server integrations... The private key
 * allows anyone to change any information they want, so you must keep this key
 * secret." It is generated per Administrator user (CRM → user menu → Edit My
 * User → API Keys), so it carries that user's own permissions.
 *
 * ## OAuth 2.0 exists — deliberately not shipped here
 *
 * The same OpenAPI document also declares an `OAuth2` authorization-code
 * scheme (`authorizationUrl: https://crm.bloomerang.com/authorize/`,
 * `tokenUrl`/`refreshUrl: https://api.bloomerang.co/v2/oauth/token`, scopes
 * `ViewOnly` / `StandardEditFinancialData` / `Standard` / `OrgAdmin`).
 * Bloomerang's own docs recommend it specifically for the case of "allowing a
 * third party access to your data" — a multi-tenant listed integration. This
 * app ships the private key instead because it needs no app registration, no
 * redirect URI and no client secret, which is the right tradeoff for a
 * server-to-server connection a single org sets up for itself. OAuth can be
 * added as a second `AuthDefinition` if that changes.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "Private Key",
  description:
    "Paste a private API key generated in Bloomerang under the user menu → Edit My User → API " +
    "Keys. Sent as the X-API-KEY header. The key carries that Administrator user's own " +
    "permissions, so keep it secret — Bloomerang's own docs are explicit that it can change " +
    "any data in the account.",
  apiKey: { in: "header", name: "X-API-KEY" },
  connectionLabel: "{{user.name}} — {{user.email}}",
  fields: [
    {
      key: "apiKey",
      label: "Private Key",
      type: "secret",
      required: true,
      hint: "Bloomerang CRM → user icon (top right) → Edit My User → API Keys.",
    },
  ],

  /**
   * The ONLY hook handed the raw credential, and it runs network-less: it
   * stamps the header onto the outbound request and returns it.
   */
  sign({ request, credential }) {
    const { apiKey: key } = credential as { apiKey: string };
    request.headers["x-api-key"] = key;
    return request;
  },

  /**
   * `GET /user/current` — "Gets the user corresponding to the private API key
   * used", per Bloomerang's own OpenAPI summary for the endpoint.
   *
   * This is the right liveness probe because it requires no permission beyond
   * the key simply existing: every private key belongs to exactly one
   * Administrator user, and that user can always read their own record. A
   * resource probe (say `/constituents/search`) would work too, but `/user/
   * current` is the narrowest scope-free option and — unlike an endpoint whose
   * name suggests "your own API key" — its response body carries the user's
   * own name/email/permission level, never the key itself, so there is no risk
   * of echoing the credential back out.
   */
  async test({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey?: string };
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_URL}/user/current`, {
      headers: { accept: "application/json", "x-api-key": key },
    });
    if (res.status === 401) {
      const body = await res.json().catch(() => null) as { Message?: string } | null;
      return { ok: false, message: body?.Message ?? "Bloomerang rejected the private key (401)" };
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null) as { Message?: string } | null;
      return { ok: false, message: body?.Message ?? `Bloomerang returned HTTP ${res.status}` };
    }
    return { ok: true };
  },

  /**
   * Labels the Connection with the key's owning user, from the same
   * `/user/current` payload. Only display-safe fields are copied out — never
   * the credential.
   */
  async afterConnect({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey: string };
    const res = await ctx.fetch(`${API_URL}/user/current`, {
      headers: { accept: "application/json", "x-api-key": key },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as {
      Id?: number;
      Name?: string;
      Email?: string;
    } | null;
    if (!body) return {};

    return {
      user: {
        id: body.Id !== undefined ? String(body.Id) : undefined,
        name: body.Name,
        email: body.Email,
      },
    };
  },
};

export default apiKey;
