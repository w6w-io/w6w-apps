import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Tapfiliate API key — `X-Api-Key: <key>`, no prefix.
 *
 * Verified against `https://tapfiliate.com/docs/rest/`'s "Authentication"
 * section (fetched 2026-09-05) and live probes against `api.tapfiliate.com`
 * the same day:
 *
 * > "Authentication with the Tapfiliate API is achieved by sending your
 * > X-Api-Key along in the header of every request … Your API keys can
 * > approve commissions, so be sure to keep them secret!"
 *
 * Unlike some vendors covered elsewhere in this pack, Tapfiliate documents no
 * scoped/limited-permission key: one key is the whole account's credential,
 * and the docs' own warning ("can approve commissions") says why it must be
 * a `secret` field.
 *
 * ## The probe body shape depends on the header being non-empty — verified live
 *
 * Three requests to `GET /1.6/programs/`, all on 2026-09-05:
 *
 *  | Header sent                  | Status | Content-Type | Body |
 *  |-------------------------------|--------|--------------|------|
 *  | *(none)*                      | 401    | `text/html`  | the web app's "Unauthorized" page |
 *  | `X-Api-Key:` (empty string)   | 401    | `text/html`  | the same HTML page |
 *  | `X-Api-Key: totally-bogus`    | 401    | `application/json` | `{"message":"Authentication Failed.","code":401}` |
 *
 * Only the third case is a JSON API error. A `test` hook that skips the
 * "is the credential non-empty" guard and lets an empty string reach the
 * wire would receive an HTML document and either throw an unhelpful parse
 * error or (worse) misreport the failure, because the response never carries
 * Tapfiliate's own `code`/`message`. Guarding locally, before the fetch,
 * turns that into the same clear "credential missing" message every other
 * app in this pack gives for the same case.
 *
 * ## The probe: `GET /programs/`
 *
 * Chosen because it (a) requires the credential — unauthenticated or
 * empty-keyed it 401s, as shown above; (b) is a plain read with no
 * side-effects and no required parameters, so it is invocable with `{}`;
 * (c) returns nothing secret — a program's `id`, `title`, `currency`,
 * `cookie_time` and commission category, none of it credential material.
 * There is no narrower "whoami" endpoint in this API to prefer instead: the
 * key is account-wide by design, so no read is more scoped than any other.
 */

export interface TapfiliateCredential {
  apiKey: string;
}

/** The one place the wire format is built — reused by `sign` and `test`. */
export function authHeaders(credential: Partial<TapfiliateCredential>): Record<string, string> {
  return { "x-api-key": credential.apiKey ?? "" };
}

export const PROBE_PATH = "/programs/";

interface TapfiliateErrorBody {
  message?: string;
  code?: number;
}

const apiKeyAuth: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste the API key from your Tapfiliate account settings (Settings > API). This key can " +
    "approve commissions, so keep it secret.",
  apiKey: { in: "header", name: "X-Api-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Tapfiliate dashboard > Settings > API.",
    },
  ],

  /** Credential-only, network-less: stamps the header and returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<TapfiliateCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<TapfiliateCredential>;
    const apiKey = (cred?.apiKey ?? "").trim();
    // See the module doc: an empty key gets an HTML login-wall page, not a
    // JSON error, so this is checked before the request is even made.
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey }) },
    });
    if (res.ok) return { ok: true };

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("json")) {
      return {
        ok: false,
        message:
          `Tapfiliate returned a non-JSON response (HTTP ${res.status}, ${
            contentType || "no content-type"
          }) — this is what a missing or empty credential looks like on this API, so the key may ` +
          "not have reached the request.",
      };
    }

    const body = await res.json().catch(() => null) as TapfiliateErrorBody | null;
    if (res.status === 401) {
      return {
        ok: false,
        message: `Tapfiliate rejected the key (401${body?.message ? `: ${body.message}` : ""}). ` +
          "Check it was copied exactly from Settings > API.",
      };
    }
    return {
      ok: false,
      message: `Tapfiliate returned HTTP ${res.status} for ${PROBE_PATH}` +
        `${body?.message ? `: ${body.message}` : ""}`,
    };
  },
};

export default apiKeyAuth;
