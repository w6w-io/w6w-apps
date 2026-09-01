import type { AuthDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

/** The wire value Freshsales's Token auth scheme expects. */
export function tokenHeader(apiKey: string): string {
  return `Token token=${apiKey}`;
}

/**
 * API key (`custom`).
 *
 * Freshsales authenticates with a bespoke `Authorization` scheme — not Basic,
 * not Bearer — `Authorization: Token token=<api_key>`. Verified against
 * developers.freshworks.com/crm/api/ §Authentication and every sample `curl`
 * on that page (all 30+ carry `-H "Authorization: Token token=sfg999666t673t7t82"`).
 * This is a different scheme from the sibling Freshworks apps in this pack —
 * Freshdesk and Freshservice both use HTTP Basic with the key as the username
 * and a throwaway password — so `type: "custom"` is used here rather than
 * copying their `type: "basic"` verbatim.
 *
 * The domain is collected here rather than per-action: it identifies the
 * account, so it belongs to the Connection. `afterConnect` echoes it onto the
 * connection's display data, which is where `lib/client.ts` reads it from.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "API Key",
  description: "Find your API key under Settings → API Settings in your Freshsales portal.",
  connectionLabel: "{{domain}}.myfreshworks.com",
  fields: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "Just the subdomain from `acme.myfreshworks.com` — not the full URL.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Settings → API Settings.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = tokenHeader(apiKey);
    return request;
  },

  /**
   * Freshsales publishes no whoami endpoint. `GET /contacts/filters` (the
   * saved-views list every list action needs anyway) is scope-free, costs a
   * single small read, and — unlike any resource endpoint — its response
   * never echoes anything the caller owns, only the account's view
   * definitions. Classified by body: a live credential returns a
   * `{"filters": [...]}` object; a dead one returns Freshsales's own
   * `{"errors": {...}}` shape, verified against the docs' "Errors" section.
   */
  async test({ credential }, ctx) {
    const { domain, apiKey } = credential as { domain?: string; apiKey?: string };
    if (!domain || !apiKey) {
      return { ok: false, message: "credential missing domain or apiKey" };
    }
    const res = await ctx.fetch(`${baseUrl(domain)}/contacts/filters`, {
      headers: { authorization: tokenHeader(apiKey) },
    });
    const body = await res.json().catch(() => undefined) as
      | { filters?: unknown[]; errors?: { code?: string; message?: string } }
      | undefined;
    if (!res.ok || !body || !Array.isArray(body.filters)) {
      const message = body?.errors?.message ?? `Freshsales returned ${res.status}`;
      return { ok: false, message };
    }
    return { ok: true };
  },

  /**
   * Records the domain on the connection so the client can build URLs
   * without ever seeing the credential.
   */
  afterConnect({ credential }) {
    const { domain } = credential as { domain?: string };
    if (!domain) return {};
    return { domain };
  },
};

export default apiKey;
