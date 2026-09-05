import type { AuthDefinition } from "@w6w/types";
import { API_URL, API_VERSION } from "../lib/client.ts";

/**
 * API Key (`custom`) — Omnisend's default auth path.
 *
 * The user pastes an API key minted under Store Settings → API → API Keys
 * (https://app.omnisend.com/integrations/api-keys). We store it verbatim and
 * every request signs with:
 *
 *   Authorization: Omnisend-API-Key <key>
 *
 * Note the non-standard scheme — this is NOT `Bearer`. Every 2026-03-15
 * request also requires a fixed `Omnisend-Version` header; the client library
 * injects it so we only worry about the auth header here. OAuth 2.0 is also
 * documented (client-credentials, `Authorization: Bearer <token>`) but is not
 * implemented by this app — the API key path covers every action here and
 * needs no redirect flow.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "API Key",
  description:
    "Paste an Omnisend API key minted under Store Settings → API → API Keys (app.omnisend.com/integrations/api-keys).",
  connectionLabel: "{{brand.name}}",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Store Settings → API → API Keys → Create API key.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Omnisend-API-Key ${apiKey}`;
    request.headers["omnisend-version"] = API_VERSION;
    return request;
  },

  // GET /brands/current is a plain read-your-own-brand call — the response
  // carries brandID/name/platform/website, never the credential itself, so
  // classifying "is this key live" from the body (not just a 200) never risks
  // echoing the key back. https://api-docs.omnisend.com/reference/get_brands-current
  //
  // Measured live 2026-09-05: an unauthenticated call and a syntactically
  // plausible but fake key both answer the identical RFC 9457 body —
  // `{"type":"https://problems.omnisend.com/unauthorized","title":"Unauthorized","status":401}`
  // — so Omnisend does not distinguish "no key" from "wrong key" here. The
  // failure branch below still reads the body rather than trusting the status
  // code alone, surfacing whatever `title`/`detail` the vendor does provide.
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    const res = await ctx.fetch(`${API_URL}/brands/current`, {
      headers: {
        authorization: `Omnisend-API-Key ${apiKey}`,
        "omnisend-version": API_VERSION,
        accept: "application/json",
      },
    });
    if (!res.ok) {
      const problem = await res.json().catch(() => null) as
        | { type?: string; title?: string; detail?: string }
        | null;
      const detail = problem?.detail ?? problem?.title;
      return {
        ok: false,
        message: detail
          ? `Omnisend rejected the key (${res.status}): ${detail}`
          : `Omnisend returned ${res.status} for /brands/current`,
      };
    }
    const body = await res.json().catch(() => null) as { brandID?: string } | null;
    if (!body || !body.brandID) {
      return { ok: false, message: "Omnisend /brands/current returned no brandID" };
    }
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    const res = await ctx.fetch(`${API_URL}/brands/current`, {
      headers: {
        authorization: `Omnisend-API-Key ${apiKey}`,
        "omnisend-version": API_VERSION,
        accept: "application/json",
      },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as {
      brandID?: string;
      name?: string;
      platform?: string;
      website?: string;
    } | null;
    if (!body) return {};
    return {
      brand: {
        id: body.brandID,
        name: body.name ?? body.brandID,
        platform: body.platform,
        website: body.website,
      },
    };
  },
};

export default apiKey;
