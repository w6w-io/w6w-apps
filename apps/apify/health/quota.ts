/**
 * How much of this account's Apify plan is left?
 *
 * ## Why this is a real probe and not a declared absence
 *
 * Apify meters two completely different things, and only one of them is
 * readable in advance:
 *
 *  1. **Request rate** — 250,000 requests/minute globally and 60 per second per
 *     resource. Responses carry `X-RateLimit-Limit` and *nothing else*: no
 *     remaining count, no reset time. Measured live on 2026-08-11 —
 *     `GET /v2/users/me` returned `x-ratelimit-limit: 90` and `GET /v2/store`
 *     returned `x-ratelimit-limit: 60`, with no `X-RateLimit-Remaining` header
 *     on either. That half is declared unavailable in `health/request-rate.ts`.
 *  2. **Plan consumption** — monthly spend, compute units, data transfer, proxy
 *     SERPs, residential proxy traffic, concurrent runs, and the Actor/task
 *     counts. `GET /v2/users/me/limits` returns the ceiling *and* the current
 *     figure for every one of them, in one call.
 *
 * The second is the one that actually stops work: an account that hits
 * `maxMonthlyUsageUsd` cannot start runs, and a workflow that schedules Actors
 * hourly will find that out at 03:00 rather than at review time. So this check
 * reads it.
 *
 * ## Same endpoint as the credential probe, on purpose
 *
 * `auth/api-token.ts` probes `/v2/users/me/limits` too. That is deliberate
 * rather than duplication: it is the one endpoint in the covered surface that
 * needs a credential, is reachable by the narrowest usable (scoped) token, and
 * returns no credential material — which makes it simultaneously the right
 * liveness probe and the only source of headroom. The two checks answer
 * different questions from the same read, and `minIntervalSeconds` keeps the
 * cost to one call a minute.
 *
 * ## What a limit of zero means
 *
 * `maxMonthlyUsageUsd` is a ceiling the *user* sets. A zero or missing value is
 * "no ceiling configured", not "no headroom", so a non-positive limit is
 * reported as unmetered rather than as 100% consumed. Reading it the other way
 * would report every unlimited account as exhausted.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

export const LIMITS_URL = `${API_BASE}${API_PREFIX}/users/me/limits`;

/** Consumption at or above this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

interface LimitsBody {
  data?: {
    monthlyUsageCycle?: { startAt?: string; endAt?: string };
    limits?: Record<string, number | undefined>;
    current?: Record<string, number | undefined>;
  };
}

/**
 * The metered dimensions, as `limits` key → `current` key.
 *
 * Copied field-for-field from the vendor's `Limits` and `Current` schemas. The
 * two objects use different names for the same dimension (`maxMonthlyProxySerps`
 * vs `monthlyProxySerps`), which is why this mapping is explicit rather than
 * derived by stripping a prefix — `maxActorMemoryGbytes` pairs with
 * `actorMemoryGbytes`, but `maxConcurrentActorJobs` pairs with
 * `activeActorJobCount`, and no rule covers both.
 */
export const QUOTA_DIMENSIONS: Array<{
  id: string;
  limitKey: string;
  currentKey: string;
  unit: string;
  /**
   * `false` for dimensions that recover on their own. Running at the concurrency
   * ceiling is a queue, not an outage, so it never reports worse than
   * `degraded`; exhausting a monthly allowance is a stop.
   */
  monthly: boolean;
}> = [
  {
    id: "monthly-usage-usd",
    limitKey: "maxMonthlyUsageUsd",
    currentKey: "monthlyUsageUsd",
    unit: "USD",
    monthly: true,
  },
  {
    id: "monthly-compute-units",
    limitKey: "maxMonthlyActorComputeUnits",
    currentKey: "monthlyActorComputeUnits",
    unit: "compute units",
    monthly: true,
  },
  {
    id: "monthly-data-transfer",
    limitKey: "maxMonthlyExternalDataTransferGbytes",
    currentKey: "monthlyExternalDataTransferGbytes",
    unit: "GB",
    monthly: true,
  },
  {
    id: "monthly-proxy-serps",
    limitKey: "maxMonthlyProxySerps",
    currentKey: "monthlyProxySerps",
    unit: "SERPs",
    monthly: true,
  },
  {
    id: "monthly-residential-proxy",
    limitKey: "maxMonthlyResidentialProxyGbytes",
    currentKey: "monthlyResidentialProxyGbytes",
    unit: "GB",
    monthly: true,
  },
  {
    id: "concurrent-actor-jobs",
    limitKey: "maxConcurrentActorJobs",
    currentKey: "activeActorJobCount",
    unit: "runs",
    monthly: false,
  },
  {
    id: "actor-count",
    limitKey: "maxActorCount",
    currentKey: "actorCount",
    unit: "Actors",
    monthly: false,
  },
  {
    id: "actor-task-count",
    limitKey: "maxActorTaskCount",
    currentKey: "actorTaskCount",
    unit: "tasks",
    monthly: false,
  },
];

/** Worst-first, matching `HEALTH_STATE_RANK` in `@w6w/types`. */
const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

export interface DimensionReading {
  quota: HealthQuota;
  state: HealthState;
  /** Set only when the dimension is at or over the warning threshold. */
  note?: string;
}

/**
 * Turn one dimension into a quota reading plus the state it implies.
 *
 * Exported so the mapping is testable without a fetch — the arithmetic is the
 * part that decides whether an account gets told it is about to stop working.
 */
export function readDimension(
  dimension: typeof QUOTA_DIMENSIONS[number],
  limits: Record<string, number | undefined>,
  current: Record<string, number | undefined>,
  resetAt?: string,
): DimensionReading | undefined {
  const limit = limits[dimension.limitKey];
  const used = current[dimension.currentKey];
  if (typeof limit !== "number" || typeof used !== "number") return undefined;

  const quota: HealthQuota = {
    id: dimension.id,
    limit,
    // Never negative: Apify can bill slightly past a ceiling before it stops
    // you, and a negative "remaining" renders as nonsense.
    remaining: Math.max(0, limit - used),
    unit: dimension.unit,
    ...(dimension.monthly && resetAt ? { resetAt } : {}),
  };

  // A non-positive ceiling is "not configured", not "exhausted".
  if (limit <= 0) return { quota, state: "ok" };

  const fraction = used / limit;
  if (fraction >= 1) {
    return {
      quota,
      state: dimension.monthly ? "down" : "degraded",
      note: `${dimension.id} at ${used}/${limit} ${dimension.unit} (100%)`,
    };
  }
  if (fraction >= WARN_FRACTION) {
    return {
      quota,
      state: "degraded",
      note: `${dimension.id} at ${used}/${limit} ${dimension.unit} (${
        Math.round(fraction * 100)
      }%)`,
    };
  }
  return { quota, state: "ok" };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan headroom",
  description:
    "Monthly spend, compute units, data transfer, proxy SERPs and residential proxy traffic, " +
    "plus concurrency and Actor/task counts, read from GET /v2/users/me/limits.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(LIMITS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // 403 here means a scoped token cannot read account limits — that says
      // nothing about headroom, so it is `unknown`, not `degraded`.
      return { state: "unknown", message: `Apify returned ${res.status} for /v2/users/me/limits` };
    }

    const body = await res.json().catch(() => null) as LimitsBody | null;
    const limits = body?.data?.limits;
    const current = body?.data?.current;
    if (!limits || !current) {
      return { state: "unknown", message: "Account limits response carried no limits/current" };
    }

    const resetAt = body?.data?.monthlyUsageCycle?.endAt;
    const quotas: HealthQuota[] = [];
    const notes: string[] = [];
    let state: HealthState = "ok";

    for (const dimension of QUOTA_DIMENSIONS) {
      const reading = readDimension(dimension, limits, current, resetAt);
      if (!reading) continue;
      quotas.push(reading.quota);
      if (reading.note) notes.push(reading.note);
      if (RANK[reading.state] > RANK[state]) state = reading.state;
    }

    if (quotas.length === 0) {
      return { state: "unknown", message: "Account limits response carried no known dimensions" };
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
