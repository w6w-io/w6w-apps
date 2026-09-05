/**
 * How much Browse API call quota is left on this app-level token?
 *
 * eBay's Developer Analytics API — a real, separately-specced REST API
 * (`developer_analytics_v1_beta_oas3.json`) — exposes exactly this via
 * `GET /developer/analytics/v1_beta/rate_limit/`: per-resource call counts,
 * limits, remaining calls and reset time for the current time window,
 * requiring only the same `https://api.ebay.com/oauth/api_scope` this app's
 * Application access token already carries (confirmed live:
 * `GET .../rate_limit/` with a fabricated bearer token returns eBay's
 * standard `401 {"errors":[{"domain":"OAuth", ...}]}`, the same shape as an
 * invalid Browse API call — not a scope-denied `403`).
 *
 * Scoped to `api_context=buy&api_name=browse`, the one API this app calls,
 * rather than pulling every API on the account's keyset into one report.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE, isOAuthError } from "../lib/client.ts";
import type { EbayErrorBody } from "../lib/client.ts";

export const RATE_LIMIT_URL =
  `${API_BASE}/developer/analytics/v1_beta/rate_limit/?api_context=buy&api_name=browse`;

/** A rate at or above this fraction of its limit is worth flagging. */
export const WARN_FRACTION = 0.9;

interface Rate {
  count?: number;
  limit?: number;
  remaining?: number;
  reset?: string;
  timeWindow?: number;
}

interface Resource {
  name?: string;
  rates?: Rate[];
}

interface RateLimit {
  apiContext?: string;
  apiName?: string;
  resources?: Resource[];
}

interface RateLimitsBody {
  rateLimits?: RateLimit[];
}

/** Worst-first, matching `HEALTH_STATE_RANK` in `@w6w/types`. */
const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

export interface RateReading {
  quota: HealthQuota;
  state: HealthState;
  note?: string;
}

/** Turn one rate into a quota reading plus the state it implies. */
export function readRate(id: string, rate: Rate): RateReading | undefined {
  if (typeof rate.limit !== "number" || typeof rate.remaining !== "number") return undefined;

  const quota: HealthQuota = {
    id,
    limit: rate.limit,
    remaining: Math.max(0, rate.remaining),
    ...(rate.reset ? { resetAt: rate.reset } : {}),
    unit: rate.timeWindow ? `calls / ${rate.timeWindow}s` : "calls",
  };

  if (rate.limit <= 0) return { quota, state: "ok" };
  if (rate.remaining <= 0) {
    return { quota, state: "down", note: `${id} has 0 of ${rate.limit} calls remaining` };
  }
  const used = 1 - rate.remaining / rate.limit;
  if (used >= WARN_FRACTION) {
    return {
      quota,
      state: "degraded",
      note: `${id} at ${rate.remaining}/${rate.limit} calls remaining (${
        Math.round(used * 100)
      }% used)`,
    };
  }
  return { quota, state: "ok" };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Browse API call quota",
  description: "Per-resource call count, limit and reset time for the Browse API, read from " +
    "the Developer Analytics API's GET /developer/analytics/v1_beta/rate_limit/.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(RATE_LIMIT_URL, { headers: { accept: "application/json" } });
    const text = await res.text();
    const body = text ? (JSON.parse(text) as RateLimitsBody & EbayErrorBody) : undefined;

    if (!res.ok) {
      // An OAuth-domain error means the token is the problem, which the
      // derived `auth:client-credentials` check already reports — this
      // check has nothing further to say about headroom.
      if (isOAuthError(body)) {
        return { state: "unknown", message: "credential could not be verified" };
      }
      return { state: "unknown", message: `eBay returned ${res.status} for the rate-limit read` };
    }

    const rateLimits = body?.rateLimits ?? [];
    const quotas: HealthQuota[] = [];
    const notes: string[] = [];
    let state: HealthState = "ok";

    for (const rl of rateLimits) {
      for (const resource of rl.resources ?? []) {
        for (const rate of resource.rates ?? []) {
          const id = `${rl.apiContext ?? "buy"}:${rl.apiName ?? "browse"}:${
            resource.name ?? "unknown"
          }`;
          const reading = readRate(id, rate);
          if (!reading) continue;
          quotas.push(reading.quota);
          if (reading.note) notes.push(reading.note);
          if (RANK[reading.state] > RANK[state]) state = reading.state;
        }
      }
    }

    if (quotas.length === 0) {
      return { state: "unknown", message: "rate-limit response carried no known resources" };
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      quota: quotas,
      ttlSeconds: 300,
    };
  },
};

export default quota;
