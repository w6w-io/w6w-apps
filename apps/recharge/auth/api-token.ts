import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_VERSION } from "../lib/client.ts";

/**
 * Recharge API token — `X-Recharge-Access-Token: <token>`.
 *
 * Verified against `developer.getrecharge.com`'s "Authentication" section
 * ("Recharge uses API keys to authenticate requests. Each request to the API
 * should contain an API token in the following header:
 * `X-Recharge-Access-Token:store_api_token`") and confirmed live 2026-09-05:
 * `GET /token_information` with no header, and the same request signed with a
 * syntactically-plausible fake token, both answer
 * `401 {"error":"bad authentication"}` — there is no `Authorization: Bearer`
 * form documented or observed for this API.
 *
 * ## Scoped tokens
 *
 * Recharge API tokens carry a fixed, merchant-configured set of scopes
 * (`read_customers`, `write_subscriptions`, …), listed in full on the
 * reference's "Authentication" page. A token scoped to only what a workflow
 * needs is the vendor's own recommended posture (every write action in this
 * app documents the scope it needs), so a Connection missing some scopes is
 * expected, not broken — which is exactly why the probe below is the one
 * endpoint in this app's surface that needs no scope at all.
 */

export interface RechargeCredential {
  apiToken: string;
}

/**
 * The one place the wire format is built. Exported so `test` exercises the
 * same code path `sign` does.
 */
export function authHeaders(credential: Partial<RechargeCredential>): Record<string, string> {
  return { "x-recharge-access-token": credential.apiToken ?? "" };
}

/**
 * The credential-liveness probe: `GET /token_information`.
 *
 * Chosen by reading the response schema, not by its name:
 *
 * **(a) It requires a credential and declares no scope.** Every other section
 * on the reference states a `Scopes:` line (`read_customers`,
 * `read_store`, …); "Retrieve token information" states none — it is
 * metadata about the token itself, not a scoped resource, so the narrowest
 * token a merchant can issue still reaches it. That rules out the tempting
 * alternative `GET /store`, which needs `read_store` and would report a
 * correctly-scoped-but-narrower Connection as broken.
 *
 * **(b) It returns no credential material.** Its documented response is
 * `{"token_information": {"client": {"name", "contact_email"},
 * "contact_email", "name", "scopes"}}` — the token's own label, who it
 * belongs to, and which scopes it carries. No key, no processor token,
 * nothing that could itself authenticate a request.
 */
export const PROBE_PATH = "/token_information";

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Token",
  description: "Paste an API token from the Recharge merchant portal (Apps > API tokens, or " +
    "under the Recharge app's settings if issued as a custom integration). Scope the token to " +
    "only the resources the workflows using this connection need.",
  connectionLabel: "Recharge ({{tokenName}})",
  apiKey: { in: "header", name: "X-Recharge-Access-Token" },
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "From the Recharge merchant portal's API token settings. Treat it like a password — " +
        "anyone holding it can act as everything the token is scoped to.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the header and returns. The token never appears in a URL.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<RechargeCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<RechargeCredential>;
    const token = (cred?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: {
        accept: "application/json",
        "x-recharge-version": API_VERSION,
        ...authHeaders({ apiToken: token }),
      },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { error?: string } | null;

    if (res.status === 401) {
      return {
        ok: false,
        message: `Recharge rejected the token (401${body?.error ? `: ${body.error}` : ""}). ` +
          "Check it was copied exactly and has not been deleted or regenerated in the merchant " +
          "portal.",
      };
    }
    return {
      ok: false,
      message: `Recharge returned HTTP ${res.status} for ${PROBE_PATH}${
        body?.error ? `: ${body.error}` : ""
      }`,
    };
  },

  /**
   * Publish the token's own name, and nothing else.
   *
   * `token_information` also carries `client` (populated only for an OAuth-app
   * token, per the reference: "If the API token was generated by an OAuth
   * app, the object will contain associated client information") and
   * `contact_email`. Neither is a secret, but neither is worth surfacing in a
   * one-line Connection label either — `name` is what a merchant actually set
   * when creating the token, and is what tells two Connections to different
   * Recharge stores apart at a glance.
   *
   * A failure here is deliberately silent: `test` has already established the
   * token is live, and a missing display label must not fail a good
   * Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<RechargeCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: {
          accept: "application/json",
          "x-recharge-version": API_VERSION,
          ...authHeaders(cred),
        },
      });
      if (!res.ok) return {};
      const body = await res.json() as { token_information?: { name?: string } };
      const tokenName = body?.token_information?.name;
      return tokenName ? { tokenName } : {};
    } catch {
      return {};
    }
  },
};

export default apiToken;
