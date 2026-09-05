import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Judge.me API key — `X-Api-Token` header + `shop_domain` query parameter.
 *
 * Verified against `securitySchemes.PrivateAPIKey` / `PublicAPIKey` (both
 * `type: apiKey, in: header, name: X-Api-Token`) and `securitySchemes.ShopDomain`
 * (`type: apiKey, in: query, name: shop_domain`) in Judge.me's OpenAPI document,
 * plus live probes against `api.judge.me` on 2026-09-05. Every protected path in
 * the document requires **both** — the header alone does not identify a store.
 *
 * A private key is scoped to the merchant's own store; a public key is the one
 * exposed to a storefront's own JS (used for widget reads). Both use the same
 * header name and the same query parameter, so this app collects one field and
 * lets the merchant paste whichever key type their use case calls for.
 *
 * OAuth2 access tokens are a second, documented credential shape
 * (`Authorization: Bearer`, shop derived from the token) but are not
 * implemented here: the spec names the authorize URL
 * (`https://app.judge.me/oauth/authorize`) but never publishes a token
 * endpoint, and `OAuth2Config.tokenUrl` cannot be filled in from a guess. See
 * `lib/client.ts` for the full account.
 *
 * ## One error message covers two different mistakes
 *
 * A wrong `apiKey`, a wrong `shopDomain`, or both, all produce the identical
 * body `{"error": "Failed to authenticate. Shop domain or Api Token is wrong"}`
 * — confirmed live. `test` reports this verbatim rather than guessing which
 * field is at fault, because the API itself does not say.
 */

export interface JudgeMeCredential {
  apiKey: string;
  shopDomain: string;
}

/**
 * The one place the wire format is built. Exported so `test` exercises the
 * same code path `sign` does — a hand-rolled second copy is how a probe ends
 * up sending a header the real requests do not.
 */
export function authHeaders(credential: Partial<JudgeMeCredential>): Record<string, string> {
  return { "x-api-token": credential.apiKey ?? "" };
}

/** The exact body Judge.me returns for any bad credential — matched, not guessed. */
export const AUTH_FAILURE_MESSAGE = "Failed to authenticate. Shop domain or Api Token is wrong";

/**
 * The credential-liveness probe.
 *
 * `GET /settings` was picked over the more obvious `GET /shops/info` because
 * the document gives `/settings` a concrete, schema-typed 200 response
 * (`{"settings": {...}}`) while `/shops/info`'s only response evidence in the
 * document is an example oddly attached under a `requestBody` on a `GET`
 * operation — almost certainly a documentation error, not a statement of the
 * real response shape (see `actions/get-shop-info.ts`). `/settings` also
 * requires no resource-specific scope beyond the credential being valid at
 * all, so it works for a Private or Public key alike, and its response
 * contains no key material of any kind.
 */
export const PROBE_PATH = "/settings";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste a Private or Public API key from your Judge.me account (Settings > Integrations > " +
    "API) along with the store's shop domain (e.g. example.myshopify.com). Both are required " +
    "together on every request.",
  connectionLabel: "Judge.me ({{shopDomain}})",
  apiKey: {
    in: "header",
    name: "X-Api-Token",
  },
  fields: [
    {
      key: "shopDomain",
      label: "Shop Domain",
      type: "string",
      required: true,
      placeholder: "example.myshopify.com",
      hint: "The store domain Judge.me has on file for this account.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Judge.me account > Settings > Integrations > API. A Private or Public key both work.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the header and the `shop_domain` query parameter and returns.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<JudgeMeCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    const url = new URL(request.url);
    url.searchParams.set("shop_domain", cred.shopDomain ?? "");
    request.url = url.toString();
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<JudgeMeCredential>;
    const apiKeyValue = (cred?.apiKey ?? "").trim();
    const shopDomain = (cred?.shopDomain ?? "").trim();
    if (!apiKeyValue || !shopDomain) {
      return { ok: false, message: "credential missing apiKey and/or shopDomain" };
    }

    const url = new URL(`${API_BASE}${API_PREFIX}${PROBE_PATH}`);
    url.searchParams.set("shop_domain", shopDomain);
    const res = await ctx.fetch(url.toString(), {
      headers: { accept: "application/json", ...authHeaders({ apiKey: apiKeyValue }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { error?: string } | null;
    if (body?.error === AUTH_FAILURE_MESSAGE) {
      return {
        ok: false,
        message:
          `Judge.me rejected the credential (${res.status}): "${AUTH_FAILURE_MESSAGE}". This ` +
          "message covers both a wrong API key AND a wrong shop domain — Judge.me does not say " +
          "which. Double-check both.",
      };
    }
    return {
      ok: false,
      message: `Judge.me returned HTTP ${res.status} for ${PROBE_PATH}${
        body?.error ? `: ${body.error}` : ""
      }`,
    };
  },
};

export default apiKey;
