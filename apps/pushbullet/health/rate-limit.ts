import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * API request-rate headroom, read straight off response headers.
 *
 * ## A genuinely readable quota — unlike most of this pack
 *
 * Pushbullet's own docs (`docs.pushbullet.com`, Limits section, fetched
 * 2026-08-29): "When you do a request to the API you will receive headers
 * like the following on the response: `X-Ratelimit-Limit: 32768`,
 * `X-Ratelimit-Remaining: 32765`, `X-Ratelimit-Reset: 1432447070`." Measured
 * live the same day on `GET /v2/users/me`: all three headers present, `Reset`
 * a unix-seconds epoch. That is a genuine *remaining* count with a reset time
 * — the opposite of Apify's per-resource ceiling-only headers (see that app's
 * `health/request-rate.ts`, declared unavailable for exactly the field
 * Pushbullet does publish).
 *
 * The vendor's own description of the unit: "a sort of generic 'cost' number.
 * A request costs 1 and a database operation costs 4." So the ceiling is not
 * "requests" in the literal sense, but it is still the number that determines
 * how much of it is left before Pushbullet starts returning `429`.
 *
 * ## Same endpoint the credential probe already calls, on purpose
 *
 * `GET /v2/users/me` is `auth/access-token.ts`'s `test` probe too — the
 * cheapest authenticated call this API has, and every authenticated response
 * carries these headers regardless of which endpoint answered. Reusing it
 * here costs nothing extra over probing a different path and keeps this
 * check's `minIntervalSeconds` the only thing bounding request volume.
 *
 * ## Recoverable, so never `down`
 *
 * The ceiling resets on a rolling window (`X-Ratelimit-Reset`), so hitting it
 * is a queue, not an outage — capped at `degraded`, the same treatment Apify's
 * `quota` check gives its non-monthly dimensions.
 */

export const PROBE_PATH = "/users/me";

/** Consumption at or above this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

const rateLimit: HealthCheckDefinition = {
  key: "rate-limit",
  title: "API rate-limit headroom",
  description:
    "Remaining request budget read from X-Ratelimit-Remaining/-Limit/-Reset on GET /v2/users/me.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      return { state: "unknown", message: `Pushbullet returned ${res.status} for ${PROBE_PATH}` };
    }

    const limitHeader = res.headers.get("x-ratelimit-limit");
    const remainingHeader = res.headers.get("x-ratelimit-remaining");
    const resetHeader = res.headers.get("x-ratelimit-reset");
    const limit = limitHeader ? Number(limitHeader) : NaN;
    const remaining = remainingHeader ? Number(remainingHeader) : NaN;
    if (!Number.isFinite(limit) || !Number.isFinite(remaining) || limit <= 0) {
      return { state: "unknown", message: "response carried no X-Ratelimit-* headers" };
    }

    const resetAt = resetHeader && Number.isFinite(Number(resetHeader))
      ? new Date(Number(resetHeader) * 1000).toISOString()
      : undefined;

    const quota: HealthQuota = {
      id: "requests",
      limit,
      remaining: Math.max(0, remaining),
      unit: "request cost units",
      ...(resetAt ? { resetAt } : {}),
    };

    const fraction = 1 - remaining / limit;
    if (remaining <= 0) {
      return {
        state: "degraded",
        message: `rate limit exhausted (0/${limit}); resets ${resetAt ?? "soon"}`,
        quota: [quota],
        ttlSeconds: 60,
      };
    }
    if (fraction >= WARN_FRACTION) {
      return {
        state: "degraded",
        message: `${remaining}/${limit} request budget left (${Math.round((1 - fraction) * 100)}%)`,
        quota: [quota],
        ttlSeconds: 60,
      };
    }
    return { state: "ok", quota: [quota], ttlSeconds: 60 };
  },
};

export default rateLimit;
