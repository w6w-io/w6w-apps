import type { AuthDefinition } from "@w6w/types";
import { BASE_URL, describeError } from "../lib/client.ts";

/**
 * A Shippo API token, sent as `Authorization: ShippoToken <token>` — verified
 * 2026-09-05 against Shippo's OpenAPI document (`APIKeyHeader` security
 * scheme: `x-token-format: "ShippoToken {token}"`) and reproduced live. This
 * is Shippo's own scheme, not Bearer — sending `Authorization: Bearer <token>`
 * gets back a distinct `{"detail": "Invalid access token."}` rather than
 * being accepted.
 *
 * ## The token itself says which environment it is for
 *
 * Every Shippo account has a **test** token and a **live** token, and unlike
 * some vendors the mode is not something you have to ask the API for — it is
 * the token's own prefix: `shippo_test_...` or `shippo_live_...` (confirmed
 * 2026-09-05 in Shippo's own "Testing the Shippo API" guide, which tells you
 * to look for the `shippo_test_` prefix on a freshly generated test key). A
 * test token creates shipments, rates and labels that look completely real —
 * nothing is charged and no label is valid postage, and nothing in the
 * response says so. So the connection test reads the prefix and reports the
 * environment back explicitly, rather than making a caller find out the hard
 * way that a workflow has been shipping with a token that buys nothing.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Token",
  description: "A Shippo API token, sent as `Authorization: ShippoToken <token>`. A TEST token " +
    "(`shippo_test_...`) returns rates and labels that look real and are not — nothing in a " +
    "response says which kind made it, only the token's own prefix does.",
  connectionLabel: "Shippo ({{mode}})",
  apiKey: {
    in: "header",
    name: "Authorization",
    prefix: "ShippoToken ",
  },
  fields: [
    {
      key: "apiKey",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Shippo dashboard → Settings → API. Test tokens (shippo_test_...) cost nothing and " +
        "produce labels that are not valid postage; live tokens (shippo_live_...) buy real " +
        "postage and are charged.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `ShippoToken ${apiKey}`;
    return request;
  },

  /**
   * `GET /carrier_accounts?results=1` — the cheapest call that both proves the
   * token works and needs no scope beyond a plain token (unlike an endpoint
   * that requires an existing shipment or address). It never echoes the
   * credential back: the response is a page of the account's own carrier
   * accounts, not anything derived from the token string.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${BASE_URL}/carrier_accounts?results=1`, {
        headers: {
          authorization: `ShippoToken ${apiKey}`,
          accept: "application/json",
        },
      });
    } catch (err) {
      return { ok: false, message: `could not reach Shippo: ${String(err)}` };
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, message: describeError(res.status, text) };
    }
    await res.body?.cancel();

    const mode = modeOf(apiKey);
    return {
      ok: true,
      message: mode === "live"
        ? "connected with a LIVE token — buying a label will purchase real postage and be charged"
        : mode === "test"
        ? "connected with a TEST token — rates and labels will look real and buy nothing"
        : "connected, but this token's prefix does not identify it as test or live",
    };
  },

  /**
   * Records the mode. Never the token — and no network call is needed to
   * learn it, since Shippo bakes the environment into the token's own prefix.
   */
  afterConnect({ credential }) {
    const { apiKey } = credential as { apiKey: string };
    return { mode: modeOf(apiKey) };
  },
};

/**
 * Which environment a token belongs to, read from its own prefix.
 *
 * Guessing would be worse than not knowing, so a token matching neither
 * documented prefix is reported as `unknown` rather than assumed either way
 * — Shippo could introduce a new prefix, or a caller could paste something
 * that isn't a Shippo token at all.
 */
export function modeOf(apiKey: string | undefined): "test" | "live" | "unknown" {
  if (!apiKey) return "unknown";
  if (apiKey.startsWith("shippo_test_")) return "test";
  if (apiKey.startsWith("shippo_live_")) return "live";
  return "unknown";
}

export default apiKey;
