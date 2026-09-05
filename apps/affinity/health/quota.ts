/**
 * How much of this account's Affinity rate limit is left?
 *
 * `GET /rate-limit` (documented under "Rate Limit" in `api-docs.affinity.co`,
 * fetched 2026-09-05) returns both limits Affinity enforces in one call:
 *
 *  - `rate.org_monthly` — the account-level call budget for the calendar
 *    month (tier-dependent: 40,000/100,000/unlimited depending on plan).
 *  - `rate.api_key_per_minute` — the per-user, per-minute budget (900/min,
 *    per the docs' "Per Minute Limits" section).
 *
 * Both come back as `{limit, remaining, reset, used}`, where `reset` is
 * **seconds until reset**, not a timestamp — `resetAt` below is therefore
 * only populated for the monthly bucket, computed from `Date.now() +
 * reset*1000` at read time, since `HealthQuota.resetAt` wants an ISO instant.
 *
 * `/rate-limit` is itself documented as exempt from the org-level monthly
 * limit, so polling it on an interval never contributes to the number it
 * reports.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

export const RATE_LIMIT_URL = `${API_BASE}/rate-limit`;

/** Consumption at or above this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

interface RateLimitBucket {
  limit?: number;
  remaining?: number;
  reset?: number;
  used?: number;
}

interface RateLimitBody {
  rate?: {
    org_monthly?: RateLimitBucket;
    api_key_per_minute?: RateLimitBucket;
  };
}

export interface DimensionReading {
  quota: HealthQuota;
  state: HealthState;
  note?: string;
}

/**
 * Turn one bucket into a quota reading plus the state it implies.
 *
 * Exported so the arithmetic is testable without a fetch. `monthly` decides
 * the worst state a bucket can report: hitting the per-minute ceiling
 * recovers within the minute (never worse than `degraded`), while exhausting
 * the monthly account budget stops every further call until next month
 * (`down`).
 */
export function readBucket(
  id: string,
  bucket: RateLimitBucket | undefined,
  unit: string,
  monthly: boolean,
  nowMs: number,
): DimensionReading | undefined {
  if (!bucket || typeof bucket.limit !== "number" || typeof bucket.remaining !== "number") {
    return undefined;
  }
  const { limit, remaining, reset, used } = bucket;

  const quota: HealthQuota = {
    id,
    limit,
    remaining: Math.max(0, remaining),
    unit,
    ...(monthly && typeof reset === "number"
      ? { resetAt: new Date(nowMs + reset * 1000).toISOString() }
      : {}),
  };

  // A non-positive limit is read as "no ceiling configured", not "exhausted" —
  // the same convention every other quota check in this pack uses, and the
  // only safe reading absent a documented example of what an unlimited-tier
  // account (Enterprise) actually returns here.
  if (limit <= 0) return { quota, state: "ok" };

  const fraction = remaining <= 0 ? 1 : 1 - remaining / limit;
  if (remaining <= 0) {
    return {
      quota,
      state: monthly ? "down" : "degraded",
      note: `${id} exhausted (0/${limit} ${unit} remaining${
        typeof used === "number" ? `, ${used} used` : ""
      })`,
    };
  }
  if (fraction >= WARN_FRACTION) {
    return {
      quota,
      state: "degraded",
      note: `${id} at ${Math.round(fraction * 100)}% (${remaining}/${limit} ${unit} left)`,
    };
  }
  return { quota, state: "ok" };
}

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate limit headroom",
  description:
    "Per-minute (user) and per-month (org) API call budgets, read from GET /rate-limit — " +
    "itself exempt from the monthly limit it reports.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(RATE_LIMIT_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Affinity returned ${res.status} for /rate-limit` };
    }

    const body = await res.json().catch(() => null) as RateLimitBody | null;
    const rate = body?.rate;
    if (!rate) return { state: "unknown", message: "/rate-limit response carried no rate object" };

    const now = Date.now();
    const readings = [
      readBucket("org-monthly", rate.org_monthly, "requests", true, now),
      readBucket("api-key-per-minute", rate.api_key_per_minute, "requests", false, now),
    ].filter((r): r is DimensionReading => r !== undefined);

    if (readings.length === 0) {
      return { state: "unknown", message: "/rate-limit response carried no known buckets" };
    }

    let state: HealthState = "ok";
    const notes: string[] = [];
    for (const reading of readings) {
      if (reading.note) notes.push(reading.note);
      if (RANK[reading.state] > RANK[state]) state = reading.state;
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      quota: readings.map((r) => r.quota),
      ttlSeconds: 60,
    };
  },
};

export default quota;
