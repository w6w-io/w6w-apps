/**
 * How much of this key's rate-limit window is left?
 *
 * ## Not in the docs, found on the wire
 *
 * `docs.reply.io/api-reference/rate-limits` documents the ceilings (100
 * requests/minute, 3,000/hour, per user) and the 429 response, but says nothing
 * about a way to read remaining headroom in advance. A live probe against
 * `GET /v3/whoami` on 2026-09-01 found it anyway: every response — a 401 with no
 * credential, and (by the same response-header machinery) presumably any other
 * status — carried
 *
 *     x-rate-limit-limit: 1h
 *     x-rate-limit-remaining: 2999
 *     x-rate-limit-reset: 2026-09-01T22:00:00.0000000Z
 *
 * `x-rate-limit-limit` is a **window label** ("1h"), not a numeric ceiling — so
 * the actual ceiling for that window is taken from the rate-limits page's own
 * documented numbers (100 for `"1m"`, 3,000 for `"1h"`) rather than invented.
 * An unrecognised window label is reported with `remaining` but no `limit`,
 * rather than guessing.
 *
 * ## Why `/v3/whoami` and not a dedicated call
 *
 * It needs a credential, needs no scope at all (so the narrowest usable key
 * still reaches it — see `auth/api-key.ts`), and every response, successful or
 * not, appears to carry these headers. Reusing the same cheap call the auth
 * probe already makes costs nothing extra.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE, API_PREFIX, WHOAMI_PATH } from "../lib/client.ts";

/** Documented on `docs.reply.io/api-reference/rate-limits`: 100/minute, 3,000/hour, per user. */
export const WINDOW_LIMITS: Record<string, number> = { "1m": 100, "1h": 3000 };

/** Consumption at or above this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

export interface RateLimitReading {
  quota: HealthQuota;
  state: HealthState;
  note?: string;
}

/**
 * Turn the three `x-rate-limit-*` headers into a quota reading. Exported so the
 * arithmetic is testable without a fetch.
 */
export function readRateLimitHeaders(
  headers: Pick<Headers, "get">,
): RateLimitReading | undefined {
  const remainingRaw = headers.get("x-rate-limit-remaining");
  if (remainingRaw === null) return undefined;
  const remaining = Number(remainingRaw);
  if (!Number.isFinite(remaining)) return undefined;

  const window = headers.get("x-rate-limit-limit") ?? undefined;
  const resetAt = headers.get("x-rate-limit-reset") ?? undefined;
  const limit = window ? WINDOW_LIMITS[window] : undefined;

  const quota: HealthQuota = {
    id: window ?? "requests",
    unit: "requests",
    remaining: Math.max(0, remaining),
    ...(limit !== undefined ? { limit } : {}),
    ...(resetAt ? { resetAt } : {}),
  };

  if (limit === undefined) {
    // No documented ceiling for this window label — report the count without
    // grading it, rather than guessing a threshold.
    return { quota, state: remaining <= 0 ? "degraded" : "ok" };
  }

  const fraction = remaining / limit;
  if (fraction <= 0) {
    return { quota, state: "degraded", note: `0/${limit} requests left in the ${window} window` };
  }
  if (1 - fraction >= WARN_FRACTION) {
    return {
      quota,
      state: "degraded",
      note: `${remaining}/${limit} requests left in the ${window} window`,
    };
  }
  return { quota, state: "ok" };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description: "Remaining requests in the current rate-limit window, read from the " +
    "x-rate-limit-* response headers on GET /v3/whoami.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${WHOAMI_PATH}`, {
      headers: { accept: "application/json" },
    });

    const reading = readRateLimitHeaders(res.headers);
    if (!reading) {
      return {
        state: "unknown",
        message: "Reply's response carried no x-rate-limit-remaining header",
      };
    }

    return {
      state: reading.state,
      message: reading.note,
      quota: [reading.quota],
      ttlSeconds: 60,
    };
  },
};

export default quota;
