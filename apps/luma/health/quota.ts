/**
 * How much of this calendar key's per-minute rate limit is left?
 *
 * Luma documents (docs.luma.com/reference/rate-limits, fetched 2026-09-01):
 *
 *   "Authenticated, rate-limited API responses include headers describing
 *   your current rate limit status": `X-RateLimit-Limit`,
 *   `X-RateLimit-Remaining`, `X-RateLimit-Reset` (window reset timestamp on
 *   success; block-expiration timestamp on 429), and `Retry-After` (429 only).
 *
 * A calendar API key is capped at 200 requests/minute; an organization key at
 * 500/minute. Exceeding it answers `429` and blocks the key for a full minute
 * — a workflow polling guests or updating tickets in a tight loop hits this
 * far sooner than any Luma outage, so headroom is worth surfacing on its own.
 *
 * ## Same probe as the credential check, deliberately
 *
 * `auth/api-key.ts` probes the same `GET /v1/users/get-self` for liveness.
 * That is not an accident: it is the cheapest signed, always-reachable read in
 * the whole surface, and its own response is what carries the rate-limit
 * headers this check reads — one call answers both questions.
 *
 * ## `X-RateLimit-Reset`'s unit is not stated in the docs
 *
 * Luma's rate-limits page calls it a "timestamp" without saying whether it is
 * Unix epoch seconds, epoch milliseconds, or an ISO string, and this app holds
 * no live calendar key to observe it on the wire. Rather than guess a unit and
 * silently mis-render a reset time, this check only converts the header to
 * `resetAt` when it parses as a plausible Unix-seconds epoch (a 10-digit
 * integer landing after 2020) — the convention every other vendor in this pack
 * uses for a header of this name (GitHub, HubSpot, Datadog). Anything else is
 * carried verbatim in `message` instead of being asserted as a date.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

/** Consumption at or above this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

/**
 * Read `X-RateLimit-Reset` as a Unix-seconds epoch, but only when the value is
 * unambiguous. See the module doc for why this is deliberately conservative.
 */
export function parseResetHeader(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return undefined;
  // 10-digit range landing after 2020-01-01T00:00:00Z (1577836800) and before
  // year 2100 (4102444800) — outside that band the value is more likely
  // milliseconds or something else entirely, so it is left unconverted.
  if (n < 1_577_836_800 || n > 4_102_444_800) return undefined;
  return new Date(n * 1000).toISOString();
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description:
    "Requests remaining in the current 1-minute window, read from the X-RateLimit-* headers on " +
    "GET /v1/users/get-self.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 30,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json" },
    });

    // A 429 here means the key is currently BLOCKED, not merely low — the
    // one moment `down` is more accurate than a "97% degraded" headroom read.
    if (res.status === 429) {
      const retryAfter = res.headers.get("retry-after");
      return {
        state: "down",
        message: `Rate limit exceeded${retryAfter ? ` — retry after ${retryAfter}s` : ""}`,
        ttlSeconds: 30,
      };
    }
    if (!res.ok) {
      return { state: "unknown", message: `Luma returned ${res.status} for ${PROBE_PATH}` };
    }

    const limit = res.headers.get("x-ratelimit-limit");
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (limit === null || remaining === null) {
      // Observed on a 200 with no rate-limit headers at all — Luma's doc says
      // these accompany "rate-limited" responses, which this one apparently
      // wasn't classified as. Not evidence of a problem, just nothing to read.
      return { state: "unknown", message: "Luma returned no X-RateLimit-* headers" };
    }

    const limitNum = Number(limit);
    const remainingNum = Number(remaining);
    if (!Number.isFinite(limitNum) || !Number.isFinite(remainingNum) || limitNum <= 0) {
      return { state: "unknown", message: `Unreadable rate-limit headers: ${limit}/${remaining}` };
    }

    const resetAt = parseResetHeader(res.headers.get("x-ratelimit-reset"));
    const quotaReading: HealthQuota = {
      id: "requests-per-minute",
      limit: limitNum,
      remaining: remainingNum,
      unit: "requests",
      ...(resetAt ? { resetAt } : {}),
    };

    const used = limitNum - remainingNum;
    const fraction = used / limitNum;
    if (fraction >= 1) {
      return {
        state: "down",
        message: `0 of ${limitNum} requests/minute remaining`,
        quota: [quotaReading],
        ttlSeconds: 30,
      };
    }
    if (fraction >= WARN_FRACTION) {
      return {
        state: "degraded",
        message: `${remainingNum} of ${limitNum} requests/minute remaining (${
          Math.round(fraction * 100)
        }% used)`,
        quota: [quotaReading],
        ttlSeconds: 30,
      };
    }
    return { state: "ok", quota: [quotaReading], ttlSeconds: 30 };
  },
};

export default quota;
