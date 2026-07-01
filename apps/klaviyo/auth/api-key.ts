import type { AuthDefinition } from "@w6w/types";
import { API_REVISION, API_URL } from "../lib/client.ts";

/**
 * API Key (`custom`) — Klaviyo's Private API Key path.
 *
 * The user pastes a Private API Key minted under Account → Settings → API
 * Keys (starts `pk_`). We store it verbatim and every request signs with:
 *
 *   Authorization: Klaviyo-API-Key <key>
 *
 * Note the non-standard scheme — this is NOT `Bearer`. Klaviyo also requires
 * a pinned `revision` header on every request; the client library injects it
 * so we only worry about the auth header here.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "Private API Key",
  description:
    "Paste a Klaviyo Private API Key (starts `pk_`) minted under Account → Settings → API Keys.",
  connectionLabel: "{{account.company}}",
  fields: [
    {
      key: "apiKey",
      label: "Private API Key",
      type: "secret",
      required: true,
      hint: "Account → Settings → API Keys → Create Private API Key. Starts with `pk_`.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Klaviyo-API-Key ${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    const res = await ctx.fetch(`${API_URL}/accounts/`, {
      headers: {
        authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: API_REVISION,
        accept: "application/json",
      },
    });
    if (!res.ok) return { ok: false, message: `Klaviyo returned ${res.status}` };
    const body = await res.json().catch(() => null) as
      | { data?: Array<unknown> }
      | null;
    if (!body || !Array.isArray(body.data) || body.data.length === 0) {
      return { ok: false, message: "Klaviyo /accounts/ returned no data" };
    }
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    const res = await ctx.fetch(`${API_URL}/accounts/`, {
      headers: {
        authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: API_REVISION,
        accept: "application/json",
      },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as {
      data?: Array<{
        id?: string;
        attributes?: {
          contact_information?: { organization_name?: string };
          public_api_key?: string;
        };
      }>;
    } | null;
    const acct = body?.data?.[0];
    return {
      account: {
        id: acct?.id,
        company: acct?.attributes?.contact_information?.organization_name ?? acct?.id,
        publicApiKey: acct?.attributes?.public_api_key,
      },
    };
  },
};

export default apiKey;
