import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * TidyCal personal access token — `Authorization: Bearer <token>`.
 *
 * The header shape is quoted verbatim from TidyCal's own reference (the
 * `info.description` of its OpenAPI document, fetched 2026-08-11):
 *
 *     Authorization: Bearer {TOKEN}
 *
 * Tokens are created at Integrations → Advanced → "Manage API keys" →
 * "Personal tokens" (`https://tidycal.com/integrations/advanced`). The same
 * paragraph states that **API access requires a paid plan**, so a token cannot
 * exist for a free account at all — an account that "has no API key" is a
 * billing fact, not a configuration mistake.
 *
 * ## Header only
 *
 * TidyCal documents no `?token=` query alternative, and this app never builds
 * one: a workflow host logs request URLs and does not log request headers.
 *
 * ## Scopes
 *
 * TidyCal's Laravel Passport server does issue scoped tokens — its MCP server
 * takes the single `mcp:scheduling:read` scope — but the REST reference
 * documents no scope for personal tokens and no per-endpoint scope requirement.
 * So this app assumes an unscoped token and picks a probe that needs nothing
 * beyond identity anyway; see {@link PROBE_PATH}.
 */

export interface TidyCalCredential {
  token: string;
}

/**
 * The one place the wire format is built. Exported so `test` and `afterConnect`
 * exercise the same code path `sign` does — a hand-rolled second copy is how a
 * probe ends up sending a header the real requests do not.
 */
export function authHeaders(credential: Partial<TidyCalCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.token ?? ""}` };
}

/**
 * The credential-liveness probe.
 *
 * `GET /api/me` was chosen by reading its **response schema**, not its name.
 * TidyCal's `User` schema has exactly seven properties — `name`, `email`,
 * `lifetime_pro_at`, `vanity_path`, `language`, `profile_picture_url`,
 * `currency_symbol` — and not one of them is a credential. That check is the
 * whole point: Follow Up Boss's `/me` and Mailjet's `/apikey` return the
 * caller's own API key, and both are banned pack-wide for it. TidyCal's does
 * not, so the cheap whoami is safe here.
 *
 * It is also the only endpoint in the surface that needs no id and reads no
 * resource. Every alternative is a collection — `/booking-types`, `/teams`,
 * `/contacts` — and each carries something a probe has no business storing:
 * `BookingType` includes `payment_platform_id` (the Stripe/PayPal connection
 * UUID), and `/contacts` is a list of third parties' names, emails, phone
 * numbers and IP addresses. A health probe's response is persisted and
 * displayed; `/me` is the one that puts nothing but the account holder's own
 * identity on the wire.
 *
 * Verified live on 2026-08-11: `GET https://tidycal.com/api/me` with no
 * credential answers `401 {"message":"Unauthenticated."}`, so it genuinely
 * requires one — a Connection whose token never got attached cannot sail
 * through it.
 */
export const PROBE_PATH = "/me";

/**
 * TidyCal returns the **same** body for "no token" and "bad token".
 *
 * Measured 2026-08-11: unauthenticated and with a syntactically plausible fake
 * bearer, `GET /api/me` answers byte-identically —
 * `HTTP/2 401` + `{"message":"Unauthenticated."}` (30 bytes, no
 * `WWW-Authenticate` header, no error code). So unlike Apify, there is no way
 * to tell "the credential never reached the request" from "the credential is
 * wrong", and `test` must not pretend otherwise: it reports one message that
 * names both possibilities.
 */
export const UNAUTHENTICATED_BODY = "Unauthenticated.";

const personalToken: AuthDefinition = {
  key: "personal-token",
  type: "bearer",
  displayName: "Personal Access Token",
  description:
    'Paste a personal access token from TidyCal → Integrations → Advanced → "Manage API keys" ' +
    '→ "Personal tokens". API access requires a paid TidyCal plan.',
  connectionLabel: "TidyCal ({{email}})",
  fields: [
    {
      key: "token",
      label: "Personal access token",
      type: "secret",
      required: true,
      hint: 'Created at Integrations → Advanced → "Manage API keys". Use a token dedicated to ' +
        "this connection rather than one shared with other services.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns. The token never appears in a URL.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<TidyCalCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why `/me` and not a collection read. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<TidyCalCredential>;
    const token = (cred?.token ?? "").trim();
    if (!token) return { ok: false, message: "credential missing token" };

    const res = await ctx.fetch(`${API_URL}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ token }) },
    });
    if (res.ok) return { ok: true };

    if (res.status === 401) {
      return {
        ok: false,
        message:
          "TidyCal rejected the request (401 Unauthenticated). It returns the same body for a " +
          "missing and an invalid token, so check the token was copied exactly, has not been " +
          "revoked under Integrations → Advanced, and that the account is on a paid plan.",
      };
    }
    if (res.status === 403) {
      return { ok: false, message: "TidyCal refused the account read (403)." };
    }
    return { ok: false, message: `TidyCal returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  /**
   * Publish the account holder's name, email and vanity path — the three fields
   * that make a list of Connections readable — and drop the rest.
   *
   * `profile_picture_url`, `language`, `currency_symbol` and `lifetime_pro_at`
   * are deliberately not kept: a Connection label does not need them, and
   * narrowing what is *kept* is cheaper to keep correct than auditing what a
   * whole-object copy might one day contain.
   *
   * A failure here is deliberately silent: `test` has already established the
   * token is live, and a missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<TidyCalCredential>;
    try {
      const res = await ctx.fetch(`${API_URL}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      // `GET /me` answers the bare `User` entity, not `{"data": …}` — see the
      // envelope note in `lib/client.ts`.
      const body = await res.json() as {
        name?: string;
        email?: string;
        vanity_path?: string;
      };
      const out: Record<string, string> = {};
      if (body?.name) out.name = body.name;
      if (body?.email) out.email = body.email;
      if (body?.vanity_path) out.vanityPath = body.vanity_path;
      return out;
    } catch {
      return {};
    }
  },
};

export default personalToken;
