import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, formatTrustpilotError } from "../lib/client.ts";

/**
 * Trustpilot API Key — a bare `apikey: <key>` header, no token and nothing to refresh.
 *
 * Per the Authentication overview: "You can access public APIs with only your API key
 * (Client ID)... You don't need an access token. You can pass your key in as an HTTP
 * header: `apikey:{key}`. You should avoid passing your API key as a query parameter, as
 * this can expose your API key." This app only ever sends it as a header — the query-
 * parameter form is deliberately unreachable, for the reason the vendor itself gives.
 *
 * Confusingly, the same value Trustpilot calls "API Key" here is also called the "Client
 * ID" on the OAuth pages — it is the same credential, just addressed two ways depending
 * on which flow reads it. This method covers the header form only; see
 * `client-credentials.ts` for the OAuth form, which additionally needs a Client Secret.
 *
 * ## Probe: `GET /v1/business-units/search`
 *
 * Chosen over the more obvious `GET /v1/business-units/find` because `find` requires a
 * `name` (a domain) the health check has no legitimate reason to invent on the caller's
 * behalf, where `search` takes a free-text `query` this probe can supply itself without
 * presuming anything about the connected account's own business. Both are public,
 * unscoped endpoints reachable by any valid key — Trustpilot's API key model has no
 * documented concept of a "scoped" key the way Apify's tokens do, so there is no
 * narrower-vs-wider tradeoff to make here.
 *
 * Trustpilot's own "Common error messages" page documents 401 as "the request lacked
 * valid authentication" and gives no worked example of the response body for any
 * endpoint. This app could not observe one live either — every probe against
 * `api.trustpilot.com` from this environment was refused by Trustpilot's own CloudFront
 * WAF before it reached the API (see README) — so `test` reads whatever the body
 * contains defensively (via `formatTrustpilotError`) rather than trusting the status code
 * alone, but the status code is still the strongest signal this vendor's own
 * documentation gives for this case.
 */
export interface TrustpilotApiKeyCredential {
  apiKey: string;
}

const apiKeyAuth: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste the API Key (Client ID) from your app's page in Trustpilot Business → " +
    "Integrations → API. Reaches the public Business Units and Product Reviews endpoints — " +
    "no OAuth, no browser sign-in, nothing to renew.",
  connectionLabel: "Trustpilot API Key",
  apiKey: { in: "header", name: "apikey" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Trustpilot Business → Integrations → API & Data → your app's Client ID.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps the
   * header and returns.
   */
  sign({ request, credential }) {
    const { apiKey } = credential as Partial<TrustpilotApiKeyCredential>;
    request.headers["apikey"] = apiKey ?? "";
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as Partial<TrustpilotApiKeyCredential>;
    const key = (apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential is missing apiKey" };

    const url = new URL(`${API_BASE}${API_PREFIX}/business-units/search`);
    url.searchParams.set("query", "trustpilot");
    url.searchParams.set("perpage", "1");

    const res = await ctx.fetch(url.toString(), {
      headers: { accept: "application/json", apikey: key },
    });
    if (res.ok) {
      await res.body?.cancel();
      return { ok: true };
    }

    if (res.status === 401) {
      await res.body?.cancel();
      return {
        ok: false,
        message: "Trustpilot rejected the API Key (401) — check it was copied exactly from " +
          "Trustpilot Business → Integrations → API and has not been regenerated.",
      };
    }
    return {
      ok: false,
      message: await formatTrustpilotError(res, "GET", "/business-units/search"),
    };
  },
};

export default apiKeyAuth;
