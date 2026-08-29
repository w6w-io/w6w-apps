import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, formatDialpadError } from "../lib/client.ts";

/**
 * Dialpad API key — `Authorization: Bearer <api_key>`.
 *
 * Verified against Dialpad's OpenAPI 3.1 document (`components.securitySchemes`,
 * fetched 2026-08-29) and live probes against `dialpad.com` the same day.
 *
 * ## One scheme, two ways to get a token
 *
 * The spec declares a single security scheme, `bearer_token` (HTTP bearer), and
 * the document's own "Authentication" section says: "All requests are
 * authenticated via an API key in the query parameter or as a bearer token in
 * the Authorization header." This app only ever uses the header — a query
 * parameter puts the key in server logs and browser history, the same reasoning
 * the pack already applies to Apify's `?token=` form.
 *
 * A workflow builder gets that bearer value one of two ways:
 *  1. **A static API key**, minted once from the Dialpad admin web portal
 *     (Admin Settings > Integrations > API), which is what this Auth method
 *     collects.
 *  2. **An OAuth2 access token**, minted per-installation for a registered
 *     Dialpad Marketplace app (`GET /oauth2/authorize`, `POST /oauth2/token`).
 *     That flow exists to let one OAuth app serve *many* companies without each
 *     admin hand-copying a key, and it needs a `client_id`/`client_secret` pair
 *     registered with Dialpad ahead of time — a prerequisite this Auth method
 *     cannot satisfy generically. Both paths end at the same bearer header, so
 *     nothing here is lost for a single-company connection: paste the static
 *     key. A dedicated `oauth2` Auth method is straightforward to add later if
 *     this app is ever registered as a Dialpad Marketplace app.
 *
 * ## Company-level vs user-level keys
 *
 * A key minted for a specific user is scoped to that user — `users.update`'s
 * own path doc says "'me' can be used if you are using a user level API key" —
 * while a **company admin** key reaches everything, including endpoints the
 * spec marks `x-access: admin` (`company.get`, and any endpoint whose
 * description says "Requires a company admin API key"). This app declares
 * several admin-only actions (`company-get`, `users-create`, `users-delete`,
 * …), so a user-level key will see some of them fail with a `403` rather than
 * the connection being broken — the same "a scoped credential is a supported
 * configuration" posture the pack already documents for Apify's scoped tokens.
 */

export interface DialpadCredential {
  apiKey: string;
}

/**
 * The one place the wire format is built. Exported so `test` and the probe
 * exercise the same code path `sign` does.
 */
export function authHeaders(credential: Partial<DialpadCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/**
 * The credential-liveness probe: `GET /api/v2/offices`.
 *
 * Chosen by reading the spec's own `x-access` tags rather than by convenience:
 * `offices.list` is tagged `x-access: user`, meaning **both** a user-level and
 * a company-admin key can call it — unlike `company.get`, which the spec tags
 * `x-access: admin` and would report a perfectly good user-level Connection as
 * broken. It also returns nothing secret: an `OfficeProto` is name, hours,
 * phone numbers and e911 address, never a credential. A syntactically-plausible
 * but wrong key and a completely absent one both answer the byte-identical
 * `401 "A valid API key must be provided."` (measured live 2026-08-29), so this
 * probe cannot and does not try to distinguish those two cases — only whether
 * the credential Dialpad received right now works.
 */
export const PROBE_PATH = "/offices";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste an API key from Dialpad Admin Settings > Integrations > API. A company admin key " +
    "reaches every action this app declares; a user-level key works for user-scoped actions " +
    "(calls, SMS, your own profile) and will see admin-only ones (company info, creating or " +
    "deleting users) refused.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Dialpad Admin Settings > Integrations > API. Use a key dedicated to this connection.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps the header and returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<DialpadCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<DialpadCredential>;
    const token = (cred?.apiKey ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: token }) },
    });
    if (res.ok) return { ok: true };

    if (res.status === 401) {
      return {
        ok: false,
        message:
          "Dialpad rejected the key (401). Dialpad does not distinguish a missing key from a " +
          "wrong one here, so check it was copied exactly from Admin Settings > Integrations > " +
          "API and has not been revoked.",
      };
    }
    const detail = await res.text().catch(() => "");
    return {
      ok: false,
      message: formatDialpadError(res.status, "GET", PROBE_PATH, detail),
    };
  },
};

export default apiKey;
