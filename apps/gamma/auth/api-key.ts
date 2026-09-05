import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, formatGammaError, parseGammaError } from "../lib/client.ts";

/**
 * Gamma API key — `X-API-KEY: <key>`, per
 * `securitySchemes.api-key` in every fetched OpenAPI fragment.
 *
 * API keys are only issued on Pro, Ultra, Teams and Business plans (see
 * `get-started/access-and-pricing.md`); Gamma's own troubleshooting guide says
 * a valid key "starts with `sk-gamma-`".
 *
 * ## The probe: `GET /themes`
 *
 * Chosen over the generation/image/gamma endpoints because it is read-only,
 * consumes no credits, needs no existing Gamma to address, and requires no
 * permission beyond an ordinary workspace member — the narrowest usable key
 * still reaches it. `limit=1` keeps the probe response tiny.
 */

export interface GammaCredential {
  apiKey: string;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from Gamma > Settings > API Keys. Requires a Pro, Ultra, Teams, or " +
    "Business plan.",
  apiKey: { in: "header", name: "X-API-KEY" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "gamma.app/settings/api-keys — starts with sk-gamma-.",
    },
  ],

  /** The only hook given the raw credential. Runs network-less: stamps the header, returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<GammaCredential>;
    request.headers["x-api-key"] = cred.apiKey ?? "";
    return request;
  },

  /**
   * Classify by response BODY, never by status code alone: a schema-correct
   * `{message, statusCode}` error body still proves the API is reachable, and
   * only its content says whether THIS key is the problem.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<GammaCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/themes?limit=1`, {
      headers: { accept: "application/json", "x-api-key": key },
    });
    if (res.ok) return { ok: true };

    const text = await res.text();
    const body = parseGammaError(text);
    if (res.status === 401) {
      return {
        ok: false,
        message: body?.message ??
          "Gamma rejected the API key (401). Check it was copied exactly from " +
            "gamma.app/settings/api-keys and has not been revoked.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: body?.message ??
          "Gamma refused the request (403). API key access requires a Pro, Ultra, Teams, or " +
            "Business plan.",
      };
    }
    return { ok: false, message: formatGammaError(res.status, "GET", "/v1.0/themes", text) };
  },
};

export default apiKey;
