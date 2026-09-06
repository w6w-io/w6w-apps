import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

/**
 * Rate-limit headroom — two independent windows, read off the same `GET /ping` call the Auth
 * `test` hook uses, so this check costs nothing beyond what liveness already pays for. The
 * runtime signs this request (`credential: "signed"`) exactly as it does an Action's `execute`
 * — nothing here builds the `Authorization` header itself.
 *
 * Verified live 2026-09-06: a successful `/ping` carries `RateLimit-Monthly-Limit`,
 * `RateLimit-Monthly-Remaining`, `RateLimit-Interval-Limit` and `RateLimit-Interval-Remaining`
 * (the interval window is documented as 1 second). Both are reported as separate `quota[]`
 * entries rather than collapsed into one number, because a workflow can burn through the
 * 1-second budget on a burst while the monthly budget still has headroom, or vice versa on a
 * long-lived connection near its monthly cap.
 */

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

function num(v: string | null): number | undefined {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function headroom(remaining?: number, limit?: number): HealthState {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Requests remaining in the current monthly and 1-second-interval windows, read off " +
    "RateLimit-Monthly-*/RateLimit-Interval-* response headers on a GET /ping call.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/vnd.api+json" },
    });

    const monthlyLimit = num(res.headers.get("ratelimit-monthly-limit"));
    const monthlyRemaining = num(res.headers.get("ratelimit-monthly-remaining"));
    const intervalLimit = num(res.headers.get("ratelimit-interval-limit"));
    const intervalRemaining = num(res.headers.get("ratelimit-interval-remaining"));

    if (monthlyRemaining === undefined && intervalRemaining === undefined) {
      return {
        state: "unknown",
        message: `response carried no RateLimit-* headers (HTTP ${res.status})`,
      };
    }

    const readings: HealthQuota[] = [];
    let state: HealthState = "ok";

    if (monthlyRemaining !== undefined) {
      readings.push({
        id: "monthly",
        limit: monthlyLimit,
        remaining: monthlyRemaining,
        unit: "requests",
      });
      const s = headroom(monthlyRemaining, monthlyLimit);
      if (RANK[s] > RANK[state]) state = s;
    }
    if (intervalRemaining !== undefined) {
      readings.push({
        id: "interval",
        limit: intervalLimit,
        remaining: intervalRemaining,
        unit: "requests",
      });
      const s = headroom(intervalRemaining, intervalLimit);
      if (RANK[s] > RANK[state]) state = s;
    }

    return { state, quota: readings, ttlSeconds: 60 };
  },
};

export default quota;
