import type { AuthDefinition } from "@w6w/types";
import { API_PATH, BASE_URL } from "../lib/client.ts";

interface CarrierSummary {
  carrier_id?: string;
  friendly_name?: string;
  nickname?: string;
}

/**
 * A ShipStation **V2** API key, sent as a plain `API-Key` request header — no
 * `Bearer`/`Basic` scheme, per `docs.shipstation.com/authentication`.
 *
 * ## Not the same key as V1
 *
 * ShipStation issues **separate** key sets for its current V2 API and its deprecated
 * V1 (legacy) API. A V1 key sent here is rejected exactly like a wrong key — there is
 * nothing in the response that says "wrong API version" versus "wrong key". This app
 * is V2-only; see `lib/client.ts` for why.
 *
 * ## Missing and invalid read identically
 *
 * Measured live 2026-08-25: `GET /v2/labels` with no `API-Key` header at all, and the
 * same call with a syntactically-valid-but-wrong key, both answer `401` with the exact
 * same body — `{"errors":[{"error_code":"unauthorized","error_type":"security",
 * "error_source":"shipengine","message":"Access denied."}]}`. `test` below can say the
 * key was rejected; it cannot say whether one was sent at all.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "A ShipStation V2 API key (from your ShipStation account's API Settings). This is NOT the " +
    "same key as ShipStation's deprecated V1 API — the two are issued and validated separately.",
  connectionLabel: "ShipStation ({{carrierCount}} carrier{{carrierCountSuffix}})",
  apiKey: { in: "header", name: "API-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "ShipStation account → Settings → Account → API Settings → V2 API Key. Sandbox keys " +
        "work here too, but are limited to 20 requests/minute (vs. 200 in production).",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["api-key"] = apiKey;
    return request;
  },

  /**
   * `GET /v2/carriers` — the connected carrier accounts. Chosen because it needs no
   * scope beyond a bare valid key, and its response is account metadata (carrier ids,
   * names, balances) rather than anything that echoes the key itself.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${BASE_URL}${API_PATH}/carriers`, {
        headers: { "api-key": apiKey, accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ShipStation: ${String(err)}` };
    }

    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel();
      // ShipStation cannot distinguish "no key sent" from "wrong key" in the body,
      // and this app cannot either — see the class doc comment above.
      return {
        ok: false,
        message: "ShipStation rejected this API key — check it is a V2 key, not a legacy V1 one",
      };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, message: `ShipStation returned ${res.status}: ${text.slice(0, 200)}` };
    }

    const body = await res.json().catch(() => null) as { carriers?: CarrierSummary[] } | null;
    const carriers = body?.carriers ?? [];
    if (carriers.length === 0) {
      return {
        ok: true,
        message: "connected, but no carrier accounts are set up yet — labels and rates will " +
          "fail until at least one carrier is connected in the ShipStation dashboard",
      };
    }
    const names = carriers.map((c) => c.friendly_name ?? c.nickname ?? c.carrier_id ?? "carrier");
    return {
      ok: true,
      message: `connected with ${carriers.length} carrier(s): ${names.join(", ")}`,
    };
  },

  /** Records the carrier count for the connection label. Never the key. */
  async afterConnect({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    try {
      const res = await ctx.fetch(`${BASE_URL}${API_PATH}/carriers`, {
        headers: { "api-key": apiKey, accept: "application/json" },
      });
      if (!res.ok) {
        await res.body?.cancel();
        return {};
      }
      const body = await res.json().catch(() => null) as { carriers?: CarrierSummary[] } | null;
      const count = body?.carriers?.length ?? 0;
      return { carrierCount: count, carrierCountSuffix: count === 1 ? "" : "s" };
    } catch {
      return {};
    }
  },
};

export default apiKey;
