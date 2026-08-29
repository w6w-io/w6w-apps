import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Missive API token — `Authorization: Bearer <token>`.
 *
 * Verified against `missiveapp.com/docs/developers/rest-api` and live probes
 * against `public.missiveapp.com` on 2026-08-29.
 *
 * ## No scopes, no organization binding
 *
 * Missive's own docs state it plainly: "All API tokens are personal. There is
 * no organization-level or shared-account-specific token. Your personal token
 * has access to any account you can access in Missive, including shared
 * accounts." There is no scoped-token concept to design a "narrowest usable
 * credential" probe around — every token this app can hold reaches every
 * endpoint its owner can reach in the app itself. Generating a token also
 * requires the organization be on Missive's Productive plan.
 *
 * ## The probe: `GET /v1/organizations`
 *
 * Chosen over the tempting `GET /v1/users` because it returns nothing but
 * organization ids and names — `GET /v1/users` returns the token owner's own
 * `email`, which is unnecessary for a liveness check and is exactly the kind
 * of "returns more than it needs to" whoami pattern this pack avoids
 * elsewhere (Follow Up Boss's `/me`, Mailjet's `/apikey`). `/v1/organizations`
 * requires a credential (verified live: both a missing token and a
 * syntactically plausible fake one answer 401) and returns no personal or
 * secret data at all.
 *
 * ## Both failure modes look identical on the wire
 *
 * Live-probed 2026-08-29: `POST /v1/drafts` with no `Authorization` header and
 * with `Authorization: Bearer missive_pat-bogus…` both answered
 * `401 {"error":{"message":"Authentication token is invalid or has been
 * revoked"}}` — the exact same message either way. So `test` cannot report
 * "no token reached the request" as distinct from "the token is wrong or
 * revoked"; both map to the same user-facing message rather than inventing a
 * distinction Missive itself doesn't draw.
 */

export interface MissiveCredential {
  apiToken: string;
}

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<MissiveCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiToken ?? ""}` };
}

/** See the module doc for why this endpoint and not `GET /v1/users`. */
export const PROBE_PATH = "/organizations";

interface MissiveErrorBody {
  error?: { message?: string };
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description:
    "Paste a personal API token from Missive Preferences > API tab > Create a new token. " +
    "Generating a token requires the organization be on Missive's Productive plan. The token " +
    "is personal — it reaches every account and shared conversation its owner can access in " +
    "Missive, including shared accounts.",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      placeholder: "missive_pat-…",
      hint: "Missive > Preferences > API tab > Create a new token.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<MissiveCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<MissiveCredential>;
    const token = (cred?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiToken: token }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as MissiveErrorBody | null;
    const message = body?.error?.message;

    if (res.status === 401) {
      return {
        ok: false,
        message: `Missive rejected the token${message ? `: ${message}` : ""}. Reconnect this ` +
          "connection with a token copied from Missive Preferences > API tab, and confirm the " +
          "organization is still on the Productive plan (token generation requires it).",
      };
    }
    return {
      ok: false,
      message: `Missive returned HTTP ${res.status} for GET ${PROBE_PATH}${
        message ? `: ${message}` : ""
      }`,
    };
  },
};

export default apiToken;
