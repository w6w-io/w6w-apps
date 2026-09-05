import type { AuthDefinition } from "@w6w/types";
import { BASE_URL, parseErrorBody } from "../lib/client.ts";

/**
 * API Key — Crunchbase's v4 OpenAPI document (fetched 2026-09-05 from the
 * `document.api.schema` embedded in https://data.crunchbase.com/reference,
 * ReadMe-hosted, "Advanced Financials Package" v1.1.0) declares exactly one
 * security scheme:
 *
 *   ApiKeyAuthHeader: { type: apiKey, in: header, name: X-cb-user-key }
 *
 * Crunchbase's own prose docs (`docs/using-the-api`) additionally describe a
 * `user_key` **query-string** parameter as an alternative. That form is not in
 * the machine-readable spec, and putting the credential in a URL means it can
 * land in access logs, browser history and referrer headers — so this app
 * uses only the header form the spec actually declares.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "From Crunchbase → Account Settings → Integrations → Crunchbase API. Sent as the " +
    "`X-cb-user-key` header on every request.",
  apiKey: { in: "header", name: "X-cb-user-key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint:
        "Your key's package (Basic, Advanced or Enterprise) decides which endpoints and fields " +
        "it can reach — a Basic key only reaches autocomplete, organization search and " +
        "organization lookup, so people/funding-round actions will 403 on it.",
    },
  ],

  /** The only hook handed the credential. It stamps the header and returns. */
  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["x-cb-user-key"] = apiKey;
    return request;
  },

  /**
   * `GET /data/autocompletes` — the one endpoint every Crunchbase package
   * includes (verified against `docs/crunchbase-basic-using-api`, which lists
   * exactly three Basic-tier endpoints: autocomplete, organization search and
   * organization entity lookup). Autocomplete is the cheapest of the three: a
   * single small query with no pagination and no PII in the response, so it
   * doubles as the narrowest-usable-credential liveness probe.
   *
   * Crunchbase answers errors as a JSON array — `[{ "status", "code",
   * "message" }]` — served with `content-type: text/plain` (verified live
   * 2026-09-05), so the body is parsed defensively rather than trusting the
   * header. Neither the request nor a Crunchbase error body ever echoes the
   * key itself.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(
      `${BASE_URL}/autocompletes?query=crunchbase&limit=1`,
      { headers: { "x-cb-user-key": apiKey, accept: "application/json" } },
    );
    if (res.ok) return { ok: true };

    const detail = await parseErrorBody(res);
    if (res.status === 401) {
      return { ok: false, message: `Crunchbase rejected the credential (${detail})` };
    }
    if (res.status === 403) {
      return { ok: false, message: `Crunchbase denied access to this endpoint (${detail})` };
    }
    return { ok: false, message: `Crunchbase returned ${res.status} (${detail})` };
  },
};

export default apiKey;
