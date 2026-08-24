/**
 * How much of this account's HeyGen billing is left?
 *
 * `GET /v3/users/me` — the same endpoint `auth/api-key.ts` uses as its liveness probe — carries a
 * `billing_type` discriminator (`UserInfoResponse.billing_type`) selecting exactly one of three
 * mutually exclusive billing blocks (verified against the OpenAPI document's `BillingType`
 * description: "Exactly one of wallet / subscription / usage_based is populated"):
 *
 *  - **`wallet`** — a prepaid USD (or, for some Enterprise accounts, credits) balance, the shape
 *    an API-key-authenticated integration is steered toward. `remaining_balance` is the whole
 *    answer; there is no published ceiling to compute a fraction against; a wallet is topped up,
 *    not renewed on a schedule, so there is no `resetAt` either.
 *  - **`subscription`** — per-pool credit balances (`premium_credits`, `add_on_credits`), each
 *    only a `remaining` count and an optional `resets_at`. No `limit` is published for either
 *    pool, so — same as `wallet` — this can report remaining but not a percentage.
 *  - **`usage_based`** — metered billing with an OPTIONAL spending cap. When
 *    `spending_cap_usd` is set it is a real ceiling: hitting it stops the account exactly the way
 *    a wallet running out does, so headroom is reported as a fraction against it, matching how
 *    every other quota check in this pack treats a documented ceiling. When no cap is configured,
 *    `remaining_credits`/`included_credits` are reported the same way a wallet balance is.
 *
 * None of the three publishes an early-warning threshold the way a request-rate limit sometimes
 * does, so this check reports `down` only once a metered figure is actually exhausted (<= 0, or at
 * 100% of a configured spending cap) rather than inventing a "degraded at 90%" band with no vendor
 * backing to point to.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

export const USER_URL = `${API_BASE}${PROBE_PATH}`;

interface CreditPool {
  remaining?: number | null;
  resets_at?: string | null;
}

interface UserInfoBody {
  data?: {
    billing_type?: "wallet" | "subscription" | "usage_based" | null;
    wallet?: { currency?: string; remaining_balance?: number | null } | null;
    subscription?: {
      plan?: string;
      credits?: { premium_credits?: CreditPool | null; add_on_credits?: CreditPool | null };
    } | null;
    usage_based?: {
      spending_current_usd?: number | null;
      spending_cap_usd?: number | null;
      included_credits?: number | null;
      remaining_credits?: number | null;
    } | null;
  };
}

/** A non-positive reading is "exhausted", not "no ceiling" — unlike a `limit`, there is no zero-means-unconfigured convention for a balance or a credit count. */
function balanceReading(id: string, remaining: number, unit: string, resetAt?: string | null) {
  const quota: HealthQuota = { id, remaining, unit, ...(resetAt ? { resetAt } : {}) };
  const state: HealthState = remaining <= 0 ? "down" : "ok";
  return { quota, state };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Billing headroom",
  description:
    "Remaining wallet balance, subscription credit pools, or usage-based spend headroom, read " +
    "from GET /v3/users/me. Exactly one billing shape is populated per account.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(USER_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `HeyGen returned ${res.status} for ${PROBE_PATH}` };
    }

    const body = await res.json().catch(() => null) as UserInfoBody | null;
    const data = body?.data;
    if (!data) return { state: "unknown", message: "User info response carried no data" };

    const quotas: HealthQuota[] = [];
    const notes: string[] = [];
    let state: HealthState = "unknown";

    if (data.billing_type === "wallet" && data.wallet) {
      const remaining = data.wallet.remaining_balance;
      if (typeof remaining === "number") {
        const reading = balanceReading("wallet-balance", remaining, data.wallet.currency ?? "usd");
        quotas.push(reading.quota);
        state = reading.state;
        if (state === "down") notes.push(`wallet balance exhausted (${remaining})`);
      }
    } else if (data.billing_type === "subscription" && data.subscription) {
      const pools: Array<["premium" | "add-on", CreditPool | null | undefined]> = [
        ["premium", data.subscription.credits?.premium_credits],
        ["add-on", data.subscription.credits?.add_on_credits],
      ];
      let worst: HealthState = "ok";
      for (const [label, pool] of pools) {
        if (!pool || typeof pool.remaining !== "number") continue;
        const reading = balanceReading(
          `${label}-credits`,
          pool.remaining,
          "credits",
          pool.resets_at,
        );
        quotas.push(reading.quota);
        if (reading.state === "down") {
          worst = "down";
          notes.push(`${label} credits exhausted`);
        }
      }
      if (quotas.length > 0) state = worst;
    } else if (data.billing_type === "usage_based" && data.usage_based) {
      const { spending_current_usd, spending_cap_usd, included_credits, remaining_credits } =
        data.usage_based;
      if (typeof spending_current_usd === "number" && typeof spending_cap_usd === "number") {
        // A real, vendor-configured ceiling — treated like any other quota's `limit`.
        const remaining = Math.max(0, spending_cap_usd - spending_current_usd);
        quotas.push({ id: "usage-spend", limit: spending_cap_usd, remaining, unit: "USD" });
        state = remaining <= 0 ? "down" : "ok";
        if (state === "down") {
          notes.push(`spending cap reached (${spending_current_usd}/${spending_cap_usd} USD)`);
        }
      } else if (typeof remaining_credits === "number") {
        quotas.push({
          id: "usage-credits",
          ...(typeof included_credits === "number" ? { limit: included_credits } : {}),
          remaining: remaining_credits,
          unit: "credits",
        });
        state = remaining_credits <= 0 ? "down" : "ok";
        if (state === "down") notes.push("usage-based credits exhausted");
      }
    }

    if (quotas.length === 0) {
      return {
        state: "unknown",
        message: `User info response carried no readable ${data.billing_type ?? "billing"} figures`,
      };
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      quota: quotas,
      ttlSeconds: 60,
    };
  },
};

export default quota;
