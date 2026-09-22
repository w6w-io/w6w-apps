import type { AuthDefinition } from "@w6w/types";
import {
  API_BASE,
  API_PREFIX,
  CURRENT_USER_PATH,
  parseErrorBody,
  queryString,
} from "../lib/client.ts";

/**
 * Brex user token — `Authorization: Bearer <token>`.
 *
 * ## Which Brex authentication story this is
 *
 * Brex documents two. This app implements the first and only the first:
 *
 *  1. **A static user token**, minted by a Brex admin in the dashboard
 *     (`dashboard.brex.com` → Settings → Developer → Create Token, choose
 *     scopes, Allow Access) and sent as `Authorization: Bearer bxt_…`. Brex's own
 *     authentication guide is written around it: "To start making calls to Brex
 *     APIs, generate a user token from your Brex dashboard and pass it along in
 *     your API call headers."
 *  2. A partner **OAuth 2.0 authorization-code flow with refresh tokens**, for
 *     ISVs taking many customer accounts through a consent screen. It is
 *     deliberately NOT built here, because it needs a registered OAuth
 *     application, a redirect URI and a live per-customer authorization step
 *     that no headless sandbox can perform. The README says so in full.
 *
 * The OpenAPI document labels the token scheme "OAuth2" because the token
 * carries OAuth-style scopes, but nothing about obtaining it is interactive, so
 * this app declares a plain `type: "bearer"` method — the same shape
 * `apps/apify/auth/api-token.ts` uses for its own static token.
 *
 * ## Tokens expire, and Brex says how
 *
 * Brex's authentication guide: a token expires after 90 days of no use, or if
 * the user it belongs to goes non-active. Both are reported by the credential
 * probe below, which is why it does not simply say "invalid".
 *
 * ## 403 is overloaded, so the status code is never the answer
 *
 * Brex's error table documents `403` as "Expired token", and a live probe on
 * 2026-09-22 with a syntactically valid but fake token answered:
 *
 *     HTTP/2 403
 *     {"type":"FORBIDDEN","message":"Invalid or Revoked Token"}
 *
 * So a `403` here can be "your token is dead", "your token expired", or "your
 * token is fine but may not read this". {@link TOKEN_REJECTED} classifies from
 * the response BODY's `type`/`message`/`code` and the status code only sets the
 * tone of a message that already knows what happened.
 */

export interface BrexCredential {
  apiToken: string;
}

/**
 * The one place the wire format is built. Exported so `test` and `afterConnect`
 * exercise the same code path `sign` does — a hand-rolled second copy is how a
 * probe ends up sending a header the real requests do not.
 */
export function authHeaders(credential: Partial<BrexCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiToken ?? ""}` };
}

/**
 * The credential-liveness probe: `GET /v2/users/me`.
 *
 * Chosen by reading the response SCHEMA and by measuring the wire on 2026-09-22,
 * not by its name:
 *
 * **(a) It requires a credential.** Unauthenticated it answers `401` with an
 * empty body and no rate-limit header, both measured — which rules out every
 * obviously-cheaper candidate that is public.
 *
 * **(b) It is the one endpoint that needs no scope beyond holding a token.**
 * Brex's user tokens are scope-limited, and a token that may not read users at
 * all still reaches this one: the endpoint's own description is "the user
 * associated with the OAuth2 access token". A probe against, say, `GET
 * /v2/cards` would report a correctly-narrowed token as broken.
 *
 * **(c) It returns no credential material.** The response is
 * `id, first_name, last_name, email, status, manager_id, department_id,
 * location_id, title_id, cost_center_id, legal_entity_id, metadata,
 * remote_display_id, custom_fields[]` — no token, key or secret field anywhere
 * in it, so nothing is copied into the health surface by probing.
 *
 * The same path is the `user-get-current` Action; {@link CURRENT_USER_PATH} and
 * `queryString()` in `lib/client.ts` are the shared halves, and the only
 * difference between the two call sites is that this one stamps the header
 * itself (it holds the credential, and runs in the auth sandbox) while the
 * Action sends none and lets the runtime route it through `sign`.
 */
export const PROBE_PATH = CURRENT_USER_PATH;

/**
 * The paths Brex uses to say the token itself is the problem.
 *
 * Body text, not status codes: `{"type":"FORBIDDEN","message":"Invalid or
 * Revoked Token"}` (measured), the docs' `{"type":"UNAUTHORIZED","message":
 * "PERMISSION_DENIED: Invalid or Revoked Token"}`, and the error table's bare
 * "Expired token" all land here. A `403` whose body says something else — a
 * scope refusal — does not, which is the whole point of matching the body.
 */
export const TOKEN_REJECTED =
  /invalid or revoked token|invalid token|revoked token|expired token|token (?:has )?expired/i;

/** Where a replacement token comes from, quoted into every rejection message. */
export const TOKEN_REPLACEMENT_HINT =
  "Generate a new user token in the Brex dashboard (Settings > Developer > Create Token) and " +
  "reconnect this connection. Brex expires a token after 90 days of no use, or when the user it " +
  "belongs to goes non-active.";

/** The absolute URL of the probe, query included. Exported so tests pin it. */
export function probeUrl(): string {
  return `${API_BASE}${API_PREFIX}${PROBE_PATH}${queryString()}`;
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "User token",
  description:
    "Paste a Brex user token generated in the Brex dashboard under Settings > Developer > " +
    "Create Token. It carries OAuth-style scopes, so create one with the scopes the workflows " +
    "using this connection need.",
  connectionLabel: "Brex ({{email}})",
  fields: [
    {
      key: "apiToken",
      label: "User token",
      type: "secret",
      required: true,
      hint: "dashboard.brex.com > Settings > Developer > Create Token. The token is shown once, " +
        "starts with `bxt_`, and is sent as `Authorization: Bearer <token>`. Give it only the " +
        "scopes this connection's workflows use, and note that Brex expires it after 90 days " +
        "without use.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps
   * the bearer header and returns. The token never appears in a URL.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<BrexCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint, and {@link TOKEN_REJECTED} for the reading. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<BrexCredential>;
    const token = (cred?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(probeUrl(), {
      headers: { accept: "application/json", ...authHeaders({ apiToken: token }) },
    });
    if (res.ok) return { ok: true };

    const detail = await res.text().catch(() => "");
    const body = parseErrorBody(detail);
    const said = [body?.type, body?.message, body?.code].filter(Boolean).join(": ");

    if (said && TOKEN_REJECTED.test(said)) {
      return {
        ok: false,
        message: `Brex rejected the token: ${said} (HTTP ${res.status}). ` +
          TOKEN_REPLACEMENT_HINT,
      };
    }

    // A 401 with an EMPTY body is what Brex answers when no credential arrives
    // at all (measured 2026-09-22). Saying so is the difference between "your
    // token is bad" and "your token never got here".
    if (!said && (res.status === 401 || res.status === 403)) {
      return {
        ok: false,
        message: `Brex answered HTTP ${res.status} for GET ${PROBE_PATH} with no error body. An ` +
          "unauthenticated call to this API answers 401 with an empty body, so the credential " +
          "most likely never reached the request — reconnect this connection.",
      };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message:
          `Brex refused the credential probe: ${said} (HTTP ${res.status}). The token itself was ` +
          "not reported as invalid, expired or revoked, so check the scopes it was created with " +
          `and whether the user it belongs to is still active. ${TOKEN_REPLACEMENT_HINT}`,
      };
    }

    return {
      ok: false,
      message: said
        ? `Brex returned HTTP ${res.status} for GET ${PROBE_PATH}: ${said}`
        : `Brex returned HTTP ${res.status} for GET ${PROBE_PATH} with no error body to classify`,
    };
  },

  /**
   * Publish the user's email, and nothing else.
   *
   * The email is what makes a list of Brex connections readable, and it is the
   * thing `connectionLabel` renders. The response also carries the user's id,
   * name, status, department/location/title/cost-centre references, metadata and
   * custom fields; none of those are published, because a connection label is a
   * label and every extra field is another thing that can leak into a Connection
   * list someone else reads. The display label carries the email only.
   *
   * A failure here is deliberately silent: `test` has already established the
   * token is live, and a missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<BrexCredential>;
    try {
      const res = await ctx.fetch(probeUrl(), {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { id?: string; email?: string };
      const email = body?.email;
      return email ? { email } : {};
    } catch {
      return {};
    }
  },
};

export default apiToken;
