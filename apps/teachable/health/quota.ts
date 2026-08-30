/**
 * Rate-limit headroom — read opportunistically, because the vendor only
 * documents the headers on a 429.
 *
 * `docs.teachable.com/docs/rate-limits` states the school-wide limit ("100
 * requests per minute for every school") and shows the three headers —
 * `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` — but only as
 * part of an *example 429 response*. It never says whether they also ride on
 * an ordinary 200, and this app has no live key to check with. Rather than
 * assume either way, this check reads the headers off whatever response it
 * gets and reports `unknown` — honestly, not a fabricated `ok` — when they are
 * absent.
 *
 * It reuses the same cheap call as `auth/api-key.ts`'s probe
 * (`GET /v1/courses?per=1`) rather than a second endpoint, for the same reason
 * Apify's `quota.ts` reuses its own auth probe: one signed call answers two
 * questions.
 *
 * ## The vendor's own example is internally inconsistent
 *
 * The guide's prose says the limit is 100/minute, then its own example 429
 * response shows `RateLimit-Limit: 360`. This check never hard-codes either
 * number — the limit is read from the header on each call, not from the guide.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

export const QUOTA_URL = `${API_BASE}${API_PREFIX}${PROBE_PATH}?per=1`;

/** Remaining fraction at or below this is worth flagging. */
export const WARN_FRACTION = 0.1;

export interface RateLimitReading {
  limit?: number;
  remaining?: number;
  resetSeconds?: number;
}

/** Parse the three headers, tolerating any subset being absent. */
export function readRateLimitHeaders(headers: Headers): RateLimitReading {
  const num = (name: string) => {
    const v = headers.get(name);
    if (v === null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    limit: num("ratelimit-limit"),
    remaining: num("ratelimit-remaining"),
    resetSeconds: num("ratelimit-reset"),
  };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description: "Requests remaining this minute against the school's rate limit, read from the " +
    "RateLimit-* response headers when Teachable sends them.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 30,

  async check(_input, ctx) {
    const res = await ctx.fetch(QUOTA_URL, { headers: { accept: "application/json" } });
    const reading = readRateLimitHeaders(res.headers);

    if (res.status === 429) {
      return {
        state: "down",
        message: "Teachable is rate-limiting this connection right now (429)",
        quota: reading.limit !== undefined || reading.remaining !== undefined
          ? [asQuota(reading)]
          : undefined,
        ttlSeconds: 30,
      };
    }

    if (reading.limit === undefined && reading.remaining === undefined) {
      return {
        state: "unknown",
        message: "Teachable did not send RateLimit-* headers on this response — the vendor " +
          "only documents them on a 429",
      };
    }

    const state: HealthState = reading.remaining !== undefined &&
        reading.limit !== undefined && reading.limit > 0 &&
        reading.remaining / reading.limit <= WARN_FRACTION
      ? "degraded"
      : "ok";

    return {
      state,
      message: state === "degraded"
        ? `${reading.remaining}/${reading.limit} requests remaining this minute`
        : undefined,
      quota: [asQuota(reading)],
      ttlSeconds: 30,
    };
  },
};

function asQuota(reading: RateLimitReading): HealthQuota {
  return {
    id: "requests-per-minute",
    limit: reading.limit,
    remaining: reading.remaining,
    unit: "requests",
  };
}

export default quota;
