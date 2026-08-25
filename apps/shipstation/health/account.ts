/**
 * Does **this connection** have any carrier accounts to actually ship with?
 *
 * A valid API key is not enough to do anything useful — `label-create` and
 * `rate-get` both need at least one connected carrier account, and ShipStation
 * reports a missing carrier as a plain business-rule validation error on the
 * label/rate call itself, not as a connection problem. This check exists so that
 * gap shows up on the Connection instead of on the first workflow run that hits it.
 *
 * It reuses `GET /v2/carriers` (the same call the Auth `test` hook already makes),
 * so a credential failure here is a duplicate of the derived `auth:api-key` check —
 * `401`/`403` is reported as `unknown` rather than `down` for exactly that reason.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_PATH, BASE_URL } from "../lib/client.ts";

interface CarrierSummary {
  carrier_id?: string;
  carrier_code?: string;
  friendly_name?: string;
  nickname?: string;
  balance?: number;
  requires_funded_amount?: boolean;
}

const account: HealthCheckDefinition = {
  key: "account",
  title: "Connected carrier accounts",
  description:
    "Whether this connection has at least one carrier account set up. A valid API key with no " +
    "connected carrier answers every rate/label request with a validation error, not an auth " +
    "error, so this check exists to surface that before a workflow run does.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 600,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${BASE_URL}${API_PATH}/carriers`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "down", message: `could not reach ShipStation: ${String(err)}` };
    }

    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel();
      // The derived auth check owns credential failures.
      return { state: "unknown", message: "the API key was rejected" };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "down", message: `ShipStation answered ${res.status}` };
    }

    const body = await res.json().catch(() => null) as { carriers?: CarrierSummary[] } | null;
    const carriers = body?.carriers ?? [];
    if (carriers.length === 0) {
      return {
        state: "degraded",
        message: "no carrier accounts are connected — every rate and label request will fail " +
          "until one is added in the ShipStation dashboard",
      };
    }

    // A "walleted" (funded) carrier like Stamps.com/USPS buys postage from a prepaid
    // balance rather than invoicing after the fact — a balance of exactly 0 on one of
    // those is worth a warning, since the next label purchase for it will fail.
    const empty = carriers.filter((c) => c.requires_funded_amount && (c.balance ?? 0) <= 0);
    const names = carriers.map((c) => c.friendly_name ?? c.nickname ?? c.carrier_id ?? "carrier");

    if (empty.length > 0) {
      const emptyNames = empty.map((c) => c.friendly_name ?? c.nickname ?? c.carrier_id);
      return {
        state: "degraded",
        message: `${carriers.length} carrier(s) connected (${names.join(", ")}), but ` +
          `${emptyNames.join(", ")} has a zero balance and needs funding before it can buy labels`,
        ttlSeconds: 600,
      };
    }

    return {
      state: "ok",
      message: `${carriers.length} carrier(s) connected: ${names.join(", ")}`,
      ttlSeconds: 600,
    };
  },
};

export default account;
