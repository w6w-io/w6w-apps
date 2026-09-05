/**
 * How many credits does this account have left to spend?
 *
 * ## The only headroom Manus exposes — and it is the one that matters
 *
 * `open.manus.ai/docs/v2/rate-limits` documents fixed per-endpoint request
 * ceilings (`task.create`: 10/min, `task.detail`: 100/min, …) but — verified
 * against that page on 2026-09-05 — publishes no `X-RateLimit-*`/`RateLimit-*`
 * response header of any kind alongside them, only a `429 rate_limited` error
 * once a caller is already over. Request-rate headroom is therefore not
 * probeable in advance; this check does not attempt it.
 *
 * What Manus DOES expose in advance is credit balance —
 * `GET /v2/usage.availableCredits`, which is also this app's Auth `test`
 * probe (`auth/api-key.ts`; the same "one endpoint, two purposes" reasoning
 * this pack uses for Apify's account-limits call). Credits are what actually
 * gates whether a task can run at all: `task.create` and every subsequent
 * turn spend from this balance, so an account at zero cannot do the one
 * thing this app exists for, regardless of how healthy the API itself is.
 *
 * ## Reading `total_credits`, not the individual buckets
 *
 * `AvailableCredits` breaks the balance into `free_credits`,
 * `periodic_credits`, `addon_credits`, `event_credits` and
 * `refresh_credits` — but the schema states `total_credits` "is the
 * authoritative spendable balance... always treat this as the single
 * authoritative value for how many credits can be spent." This check follows
 * that instruction rather than summing the buckets itself.
 *
 * `pro_monthly_credits` is a different thing — "how many periodic credits
 * the current membership tier issues each month... a quota, not a current
 * balance" — so it is surfaced as `limit` only when positive (a VIP account),
 * alongside `remaining: total_credits`, rather than conflated with it.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_BASE, type AvailableCredits } from "../lib/client.ts";

export const CREDITS_URL = `${API_BASE}/v2/usage.availableCredits`;

interface CreditsEnvelope {
  ok: boolean;
  data?: AvailableCredits;
}

/** Unix seconds → ISO 8601, or undefined when there is nothing to report. */
export function resetAtOf(credits: AvailableCredits): string | undefined {
  if (!credits.refresh_interval || !credits.next_refresh_time) return undefined;
  return new Date(credits.next_refresh_time * 1000).toISOString();
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit balance",
  description: "Spendable credit balance, read from GET /v2/usage.availableCredits.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(CREDITS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A team sub-account's key may lack visibility here without that
      // being a real outage — see the doc-note on `usage.availableCredits`
      // being unavailable to standard OAuth apps. `unknown`, not `degraded`.
      return {
        state: "unknown",
        message: `Manus returned ${res.status} for usage.availableCredits`,
      };
    }

    const body = await res.json().catch(() => null) as CreditsEnvelope | null;
    const credits = body?.data;
    if (!body?.ok || !credits) {
      return { state: "unknown", message: "Available-credits response carried no data" };
    }

    const quotaReading: HealthQuota = {
      id: "credits",
      remaining: Math.max(0, credits.total_credits),
      unit: "credits",
      ...(credits.pro_monthly_credits && credits.pro_monthly_credits > 0
        ? { limit: credits.pro_monthly_credits }
        : {}),
      ...(resetAtOf(credits) ? { resetAt: resetAtOf(credits) } : {}),
    };

    if (credits.total_credits <= 0) {
      return {
        state: "down",
        message: "Account has no spendable credits — task.create and every turn will fail",
        quota: [quotaReading],
        ttlSeconds: 60,
      };
    }

    return { state: "ok", quota: [quotaReading], ttlSeconds: 60 };
  },
};

export default quota;
