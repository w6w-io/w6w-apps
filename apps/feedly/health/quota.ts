/**
 * How much of this token's monthly request budget is left?
 *
 * Verified against the "Request Limits" and "Status Codes" reference pages
 * (fetched 2026-09-06): "Access tokens have a limit of 100,000 API requests
 * per month. Each API response will indicate how many API requests have been
 * done in the 'X-Ratelimit-Count' response header [and] the time left before
 * the counter resets in the 'X-Ratelimit-Reset' response header" (Request
 * Limits); the Status Codes page additionally documents `X-RateLimit-Limit`
 * alongside the same two. Header names are matched case-insensitively (the
 * `fetch` `Headers` object already does this), which is the only way to
 * reconcile the two pages' differing capitalisation of the same headers.
 *
 * This reuses the same call the credential probe makes (`GET /v3/profile`)
 * rather than adding a second signed request: the Request Limits page says
 * every response carries these headers, and `/v3/profile` is already the
 * cheapest authenticated call in the surface — a `Reset` timestamp is a
 * countdown in SECONDS from the moment of the call, not an absolute time, so
 * it is converted to an ISO instant here rather than stored raw.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { PROBE_PATH } from "../auth/bearer-token.ts";
import { API_BASE } from "../lib/client.ts";

/** Consumption at or above this fraction of the monthly cap is worth flagging. */
export const WARN_FRACTION = 0.9;

export interface RateLimitReading {
  limit?: number;
  count?: number;
  resetSeconds?: number;
}

/** Pull the three documented headers off a response. Exported for direct testing. */
export function readRateLimitHeaders(headers: Headers): RateLimitReading {
  const num = (name: string): number | undefined => {
    const raw = headers.get(name);
    if (raw === null) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    limit: num("x-ratelimit-limit"),
    count: num("x-ratelimit-count"),
    resetSeconds: num("x-ratelimit-reset"),
  };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Monthly request headroom",
  description:
    "Calls made this cycle vs. the token's monthly cap, read from the X-RateLimit-* headers " +
    "Feedly attaches to every response.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    // Any authenticated GET carries the headers; `/v3/profile` is the cheapest.
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      return { state: "unknown", message: `Feedly returned ${res.status} for ${PROBE_PATH}` };
    }

    const { limit, count, resetSeconds } = readRateLimitHeaders(res.headers);
    // Feedly's documented cap is 100,000/month; fall back to it only when the
    // header itself is absent, rather than guessing at a live number.
    const effectiveLimit = limit ?? 100_000;
    if (count === undefined) {
      return { state: "unknown", message: "Response carried no X-RateLimit-Count header" };
    }

    const remaining = Math.max(0, effectiveLimit - count);
    const fraction = effectiveLimit > 0 ? count / effectiveLimit : 0;
    const state: HealthState = fraction >= 1
      ? "down"
      : fraction >= WARN_FRACTION
      ? "degraded"
      : "ok";

    const resetAt = resetSeconds !== undefined
      ? new Date(Date.now() + resetSeconds * 1000).toISOString()
      : undefined;

    return {
      state,
      message: state === "ok"
        ? undefined
        : `${count}/${effectiveLimit} requests used this cycle (${Math.round(fraction * 100)}%)`,
      quota: [{
        id: "monthly-requests",
        limit: effectiveLimit,
        remaining,
        unit: "requests",
        ...(resetAt ? { resetAt } : {}),
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
