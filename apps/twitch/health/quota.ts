/**
 * How much of this connection's Twitch rate-limit bucket is left?
 *
 * ## Twitch publishes the whole picture, on every response
 *
 * From the API guide (dev.twitch.tv/docs/api/guide/, read 2026-08-11): "Twitch
 * uses a token-bucket algorithm… Your app is given a bucket of points. Each
 * endpoint is assigned a points value (the default points value per request for
 * an endpoint is 1)… If your bucket runs out of points within 1 minute, the
 * request returns status code 429." Every response carries three headers:
 *
 *  - `Ratelimit-Limit` — the bucket's size.
 *  - `Ratelimit-Remaining` — points left in it.
 *  - `Ratelimit-Reset` — a **Unix epoch second**, not a duration, at which the
 *    bucket refills. Reading it as "seconds until reset" produces a reset date
 *    in 1970 or in 2026 depending on which way you get it wrong.
 *
 * That is a complete quota reading — unlike most vendors in this pack, which
 * publish a ceiling and no remaining count — so this is a real probe rather than
 * a declared absence.
 *
 * ## Two buckets, and this reads whichever one the connection uses
 *
 * "Your app is given a bucket for app access requests and a bucket for user
 * access requests. For requests that specify a user access token, the limits are
 * applied per client ID per user per minute." A `signed` check inherits the
 * connection's own credential, so an app-token connection reports the app
 * bucket and a user-token connection reports that user's bucket. No branching is
 * needed and none is attempted — the answer is correct for the connection being
 * asked about, which is the only answer that means anything.
 *
 * ## Why `/helix/content_classification_labels` is the probe
 *
 * It is the one endpoint in this app's surface that takes no required
 * parameters, needs no scope, is reachable by BOTH token kinds, and returns a
 * small static body (seven labels). Every alternative fails one of those: the
 * whoami-shaped `/helix/users` is a 400 with an app token and no `id`, the
 * follow and moderation reads need scopes a legitimate token may lack, and
 * `/helix/games/top` returns 20 rows of live data for a question that needs
 * none.
 *
 * ## Headers absent is `unknown`, never `ok`
 *
 * Twitch only stamps the headers on responses it actually bucketed — measured
 * 2026-08-11, an unauthenticated 401 from `/helix/users` carries none. So a
 * response without them means "we learned nothing", and reporting that as full
 * headroom would be exactly the wrong lie.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

export const QUOTA_URL = `${API_BASE}${API_PREFIX}/content_classification_labels`;

/** Below this fraction of the bucket, say so. */
export const WARN_FRACTION = 0.2;

/** At or below this fraction, the next burst will start failing. */
export const CRITICAL_FRACTION = 0.05;

export interface RateLimitReading {
  limit?: number;
  remaining?: number;
  /** ISO 8601, converted from the epoch second Twitch sends. */
  resetAt?: string;
}

/** Parse an integer header, tolerating absence and junk. */
function intHeader(headers: Headers, name: string): number | undefined {
  const raw = headers.get(name);
  if (raw === null) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Read Twitch's three rate-limit headers off a response.
 *
 * Exported so the epoch conversion is testable without a fetch: it is the one
 * piece of arithmetic here, and getting it wrong produces a `resetAt` that is
 * confidently, silently wrong rather than absent.
 */
export function readRateLimit(headers: Headers): RateLimitReading {
  const resetEpochSeconds = intHeader(headers, "ratelimit-reset");
  return {
    limit: intHeader(headers, "ratelimit-limit"),
    remaining: intHeader(headers, "ratelimit-remaining"),
    // Epoch SECONDS, per the guide's example (`Ratelimit-Reset: 1781653392`).
    resetAt: resetEpochSeconds === undefined
      ? undefined
      : new Date(resetEpochSeconds * 1000).toISOString(),
  };
}

/** Turn a reading into the state it implies. Exported for the same reason. */
export function stateFor(reading: RateLimitReading): { state: HealthState; message?: string } {
  const { limit, remaining } = reading;
  if (typeof remaining !== "number") {
    return {
      state: "unknown",
      message: "Twitch returned no Ratelimit-Remaining header on this response",
    };
  }
  if (typeof limit !== "number" || limit <= 0) {
    return { state: "unknown", message: `Ratelimit-Remaining is ${remaining} but no bucket size` };
  }
  const fraction = remaining / limit;
  const detail = `${remaining}/${limit} points left (${Math.round(fraction * 100)}%)`;
  if (fraction <= CRITICAL_FRACTION) {
    return { state: "down", message: `bucket exhausted: ${detail}` };
  }
  if (fraction <= WARN_FRACTION) return { state: "degraded", message: `bucket low: ${detail}` };
  return { state: "ok", message: detail };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description:
    "Points left in this connection's Twitch token bucket, read from the Ratelimit-Limit, " +
    "Ratelimit-Remaining and Ratelimit-Reset headers of a cheap Helix call. App-token and " +
    "user-token connections have separate buckets; this reports the one this connection uses.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(QUOTA_URL, { headers: { accept: "application/json" } });

    // A 429 is the one status that is itself the answer: the bucket is empty,
    // and the headers on that response say when it refills.
    if (res.status === 429) {
      const reading = readRateLimit(res.headers);
      return {
        state: "down",
        message: "Twitch returned 429: this connection's rate-limit bucket is empty",
        quota: [{
          id: "points",
          limit: reading.limit,
          remaining: 0,
          unit: "points",
          resetAt: reading.resetAt,
        }],
        ttlSeconds: 30,
      };
    }

    if (!res.ok) {
      // A 401 here means the credential is dead, which is the auth check's
      // business, not this one's. Either way we learned nothing about headroom.
      return {
        state: "unknown",
        message: `Twitch returned ${res.status} for the quota probe, so headroom is unknown`,
      };
    }

    const reading = readRateLimit(res.headers);
    const { state, message } = stateFor(reading);
    const quotas: HealthQuota[] = reading.limit === undefined && reading.remaining === undefined
      ? []
      : [{
        id: "points",
        limit: reading.limit,
        remaining: reading.remaining,
        unit: "points",
        resetAt: reading.resetAt,
      }];

    return { state, message, quota: quotas, ttlSeconds: 60 };
  },
};

export default quota;
