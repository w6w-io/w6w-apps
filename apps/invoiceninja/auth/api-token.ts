import type { AuthDefinition } from "@w6w/types";
import { AJAX_HEADER_VALUE, normalizeBaseUrl } from "../lib/client.ts";

interface Credential {
  baseUrl?: string;
  apiToken?: string;
}

/**
 * `X-API-TOKEN` — Invoice Ninja's single supported credential.
 *
 * Verified against the OpenAPI document's `components.securitySchemes`
 * (`ApiKeyAuth: { type: apiKey, in: header, name: X-API-TOKEN }`), applied
 * globally (`security: [{ ApiKeyAuth: [] }]`) to every operation. There is no
 * separate OAuth2 flow documented for third-party integrations — a token is
 * minted per-user from Settings → Account Management → API Tokens in the
 * running instance.
 *
 * The instance URL is collected here rather than per-action: it identifies
 * which Invoice Ninja install the token belongs to, exactly like
 * `apps/discourse`'s `siteUrl` field. See `lib/client.ts` for why this app
 * cannot narrow `network.allow` to a single vendor-owned apex the way
 * `apps/gorgias`/`apps/kustomer` do.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Token",
  description:
    "Mint a token at Settings → Account Management → API Tokens on your Invoice Ninja instance.",
  connectionLabel: "{{company}} @ {{host}}",
  apiKey: {
    in: "header",
    name: "X-API-TOKEN",
    prefix: "",
  },
  fields: [
    {
      key: "baseUrl",
      label: "Instance URL",
      type: "string",
      required: true,
      default: "https://invoicing.co",
      placeholder: "https://invoicing.co",
      hint: "The hosted https://invoicing.co, the demo at https://demo.invoiceninja.com, or your " +
        "own self-hosted installation's URL.",
    },
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Settings → Account Management → API Tokens.",
    },
  ],

  sign({ request, credential }) {
    const { apiToken } = credential as Credential;
    request.headers["x-api-token"] = apiToken ?? "";
    return request;
  },

  /**
   * `GET /api/v1/ping` needs no scope beyond a valid token and echoes only
   * `{ company_name, user_name }` — never the caller's own token. Verified
   * live 2026-09-05 against `demo.invoiceninja.com`: a bad token comes back
   * **403** `{"message":"Invalid token"}`, not the `401` the OpenAPI document's
   * shared `401` response implies for this operation — so the credential is
   * classified from that JSON body, not the bare status code.
   */
  async test({ credential }, ctx) {
    const { baseUrl, apiToken } = credential as Credential;
    if (!baseUrl || !apiToken) {
      return { ok: false, message: "credential missing baseUrl or apiToken" };
    }
    let base: string;
    try {
      base = normalizeBaseUrl(baseUrl);
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }

    const res = await ctx.fetch(`${base}/api/v1/ping`, {
      headers: {
        accept: "application/json",
        "x-requested-with": AJAX_HEADER_VALUE,
        "x-api-token": apiToken,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string };
      return { ok: false, message: body.message ?? `Invoice Ninja returned ${res.status}` };
    }
    return { ok: true };
  },

  /**
   * Records the instance URL and company name on the connection so the client
   * and health checks can address the right host without ever seeing the
   * token.
   */
  async afterConnect({ credential }, ctx) {
    const { baseUrl, apiToken } = credential as Credential;
    if (!baseUrl) return {};
    let base: string;
    try {
      base = normalizeBaseUrl(baseUrl);
    } catch {
      return {};
    }
    const res = await ctx.fetch(`${base}/api/v1/ping`, {
      headers: {
        accept: "application/json",
        "x-requested-with": AJAX_HEADER_VALUE,
        "x-api-token": apiToken ?? "",
      },
    });
    if (!res.ok) return { baseUrl: base };
    const body = await res.json().catch(() => ({})) as { company_name?: string };
    return {
      baseUrl: base,
      companyName: body.company_name,
      company: body.company_name,
      host: new URL(base).host,
    };
  },
};

export default apiToken;
