/**
 * How much concurrent-call headroom does this org have left?
 *
 * Retell meters CONCURRENCY, not request rate: `GET /get-concurrency` reports
 * the number of calls ongoing right now against a per-org ceiling. There is
 * no documented request-rate header anywhere in this API's responses (a
 * 429 body is `{"status":"error","message":"Account rate limited, please
 * throttle your requests."}` with no `Retry-After` or `X-RateLimit-*`
 * header, verified against the OpenAPI document's `TooManyRequests`
 * response) — concurrency is the one headroom figure this vendor actually
 * exposes in advance, which is why it is the quota check.
 *
 * ## Burst mode changes the effective ceiling
 *
 * When `concurrency_burst_enabled` is true, the org may exceed
 * `concurrency_limit` up to `concurrency_burst_limit` at a surcharge — so the
 * ceiling this check compares against is the burst limit when burst is on,
 * not the base limit. Reading `concurrency_limit` alone would report an org
 * that has deliberately paid for burst headroom as far more exhausted than
 * it actually is.
 *
 * ## Never worse than degraded
 *
 * Running at the concurrency ceiling means the NEXT call is refused or
 * queued — a rolling condition, not a stop for the org. Unlike Apify's
 * monthly usage cap (which really can put an account into `down`), this
 * dimension recovers the moment a call ends, so it never reports worse than
 * `degraded`.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

export const CONCURRENCY_URL = `${API_BASE}/get-concurrency`;

/** Consumption at or above this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

interface ConcurrencyBody {
  current_concurrency?: number;
  concurrency_limit?: number;
  concurrency_burst_enabled?: boolean;
  concurrency_burst_limit?: number;
}

/** The arithmetic, exported so it is testable without a fetch. */
export function readConcurrency(
  body: ConcurrencyBody,
): { quota: HealthQuota; state: "ok" | "degraded" | "unknown"; message?: string } {
  const used = body.current_concurrency;
  const baseLimit = body.concurrency_limit;
  if (typeof used !== "number" || typeof baseLimit !== "number") {
    return { quota: {}, state: "unknown", message: "response carried no concurrency figures" };
  }

  const effectiveLimit = body.concurrency_burst_enabled && (body.concurrency_burst_limit ?? 0) > 0
    ? body.concurrency_burst_limit!
    : baseLimit;

  const quota: HealthQuota = {
    id: "concurrency",
    limit: effectiveLimit,
    remaining: Math.max(0, effectiveLimit - used),
    unit: "concurrent calls",
  };

  if (effectiveLimit <= 0) return { quota, state: "ok" };

  const fraction = used / effectiveLimit;
  if (fraction >= 1) {
    return {
      quota,
      state: "degraded",
      message: `at concurrency limit: ${used}/${effectiveLimit} calls`,
    };
  }
  if (fraction >= WARN_FRACTION) {
    return {
      quota,
      state: "degraded",
      message: `near concurrency limit: ${used}/${effectiveLimit} calls (${
        Math.round(fraction * 100)
      }%)`,
    };
  }
  return { quota, state: "ok" };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Concurrent-call headroom",
  description: "Current vs. maximum concurrent calls, from GET /get-concurrency.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(CONCURRENCY_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Retell returned ${res.status} for /get-concurrency` };
    }

    const body = await res.json().catch(() => null) as ConcurrencyBody | null;
    if (!body) return { state: "unknown", message: "response body was unreadable" };

    const reading = readConcurrency(body);
    return {
      state: reading.state,
      message: reading.message,
      quota: reading.quota.limit !== undefined ? [reading.quota] : undefined,
      ttlSeconds: 60,
    };
  },
};

export default quota;
