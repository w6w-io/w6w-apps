/**
 * How much of this team's Apollo credit balance is left?
 *
 * `POST /usage_stats/credit_usage_stats` returns, for every credit type the team's plan
 * meters, the cycle `limit`, `consumed` so far and `left_over` — plus the cycle's own
 * start/end dates. Confirmed against Apollo's OpenAPI document (fetched 2026-08-29):
 * `credit_usage_stats` is keyed by credit type (`lead_credit`, `direct_dial_credit`,
 * `export_credit`, `conversation_credit`, `ai_credit`, `power_up_credit`,
 * `inbound_website_visitor_credit`, `dialer`, `web_search_record_credit`,
 * `contact_website_visitor_credit` in the vendor's own example) — read generically
 * rather than as a fixed list, because a plan the code has never seen still reports
 * correctly, and a vendor-added credit type shows up without a code change here.
 *
 * This is the number that actually stops work: `lead_credit` funds every email reveal
 * this app's `people-enrich`/`people-bulk-enrich` actions can trigger, and a team that
 * runs out mid-workflow gets `0` credit-consuming fields back with no error — silently
 * looking like a bad match rather than an empty tank. `0 credits` per Apollo's own docs
 * to call this endpoint, so the check costs nothing.
 *
 * Costs no credits and needs no special scope (`api_usage_stats_read`-equivalent scopes
 * cover a Master key automatically), so it is safe to run on the same cadence as the
 * auth probe.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

export const CREDIT_USAGE_URL = `${API_BASE}/usage_stats/credit_usage_stats`;

/** Consumption at or above this fraction of the cycle limit is worth flagging. */
export const WARN_FRACTION = 0.9;

interface CreditCycle {
  start_date?: string;
  end_date?: string;
}

interface CreditBucket {
  limit?: number;
  consumed?: number;
  left_over?: number;
}

interface CreditUsageBody {
  credit_usage_stats?: Record<string, CreditBucket | undefined>;
  current_credit_cycle?: CreditCycle;
}

export interface DimensionReading {
  quota: HealthQuota;
  state: HealthState;
  note?: string;
}

/**
 * Turn one credit type's bucket into a quota reading plus the state it implies.
 * Exported so the threshold arithmetic is testable without a fetch.
 */
export function readBucket(
  id: string,
  bucket: CreditBucket | undefined,
  resetAt: string | undefined,
): DimensionReading | undefined {
  if (!bucket || typeof bucket.limit !== "number" || typeof bucket.consumed !== "number") {
    return undefined;
  }
  const { limit, consumed } = bucket;
  const remaining = typeof bucket.left_over === "number"
    ? Math.max(0, bucket.left_over)
    : Math.max(0, limit - consumed);

  const quota: HealthQuota = {
    id,
    limit,
    remaining,
    unit: "credits",
    ...(resetAt ? { resetAt } : {}),
  };

  // A non-positive limit reads as "not metered on this plan", not "exhausted".
  if (limit <= 0) return { quota, state: "ok" };

  const fraction = consumed / limit;
  if (fraction >= 1) {
    return { quota, state: "down", note: `${id} at ${consumed}/${limit} credits (100%)` };
  }
  if (fraction >= WARN_FRACTION) {
    return {
      quota,
      state: "degraded",
      note: `${id} at ${consumed}/${limit} credits (${Math.round(fraction * 100)}%)`,
    };
  }
  return { quota, state: "ok" };
}

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit balance",
  description: "Team-wide credit balances for the current billing cycle, from " +
    "POST /usage_stats/credit_usage_stats — every credit type the plan meters, read generically.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(CREDIT_USAGE_URL, {
      method: "POST",
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      // A refusal here says nothing about the balance itself.
      return { state: "unknown", message: `Apollo returned ${res.status} for credit_usage_stats` };
    }

    const body = await res.json().catch(() => null) as CreditUsageBody | null;
    const stats = body?.credit_usage_stats;
    if (!stats || Object.keys(stats).length === 0) {
      return { state: "unknown", message: "credit_usage_stats response carried no credit types" };
    }

    const resetAt = body?.current_credit_cycle?.end_date;
    const quotas: HealthQuota[] = [];
    const notes: string[] = [];
    let state: HealthState = "ok";

    for (const [id, bucket] of Object.entries(stats)) {
      const reading = readBucket(id, bucket, resetAt);
      if (!reading) continue;
      quotas.push(reading.quota);
      if (reading.note) notes.push(reading.note);
      if (RANK[reading.state] > RANK[state]) state = reading.state;
    }

    if (quotas.length === 0) {
      return { state: "unknown", message: "No recognisable credit buckets in the response" };
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
