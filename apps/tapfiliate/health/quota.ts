/**
 * How much of Tapfiliate's rate limit is left for this key?
 *
 * The docs' "Rate Limiting" section documents exactly this, and only this,
 * as a readable headroom signal:
 *
 * > "Most endpoints have rate limits. Rate limits are communicated through
 * > the following headers: X-Ratelimit-Limit … X-Ratelimit-Remaining …
 * > X-Ratelimit-Reset (Unix Timestamp in seconds)"
 *
 * There is no dedicated "quota"/"usage" endpoint documented anywhere in the
 * reference — Tapfiliate's quota is purely a request-rate ceiling, read off
 * response headers rather than a separate call.
 *
 * ## Same request as the credential probe, on purpose
 *
 * This reads the headers off `GET /programs/` — the same read
 * `auth/api-key.ts` uses to establish the key is live. That is deliberate,
 * not duplicated code: it is the one endpoint already known to need no
 * parameters and carry no side effects, so re-using it costs nothing extra
 * against the very rate limit being measured, and `minIntervalSeconds` below
 * keeps the combined cost to one call a minute.
 *
 * ## What could not be verified live
 *
 * The docs say "most" endpoints carry these headers — not all — and this app
 * has no valid API key to confirm live values or a 429 body's shape.
 * `GET /1.6/programs/` was probed unauthenticated and with a syntactically
 * wrong key on 2026-09-05: neither produced `X-Ratelimit-*` headers on a 401.
 * Whether they appear on a genuine 200 could not be checked without a real
 * account. This check treats their absence as `unknown`, never as
 * `"unmetered"` or `"ok"` — the honest reading when the vendor's own docs say
 * the header should be there and it is not observed.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

/** Consumption at or above this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

export interface RateLimitReading {
  limit?: number;
  remaining?: number;
  resetAt?: string;
}

/** Read the three `X-Ratelimit-*` headers off a `Response`. Exported so the arithmetic is testable. */
export function readRateLimitHeaders(headers: Headers): RateLimitReading {
  const limitRaw = headers.get("x-ratelimit-limit");
  const remainingRaw = headers.get("x-ratelimit-remaining");
  const resetRaw = headers.get("x-ratelimit-reset");

  const limit = limitRaw !== null ? Number(limitRaw) : undefined;
  const remaining = remainingRaw !== null ? Number(remainingRaw) : undefined;
  const resetAt = resetRaw !== null && Number.isFinite(Number(resetRaw))
    ? new Date(Number(resetRaw) * 1000).toISOString()
    : undefined;

  return {
    limit: Number.isFinite(limit) ? limit : undefined,
    remaining: Number.isFinite(remaining) ? remaining : undefined,
    resetAt,
  };
}

/** Turn a reading into the state it implies. Exported so the threshold logic is testable without a fetch. */
export function stateFor(reading: RateLimitReading): { state: HealthState; message?: string } {
  if (reading.limit === undefined || reading.remaining === undefined) {
    return { state: "unknown" };
  }
  if (reading.limit <= 0) return { state: "ok" };

  const used = reading.limit - reading.remaining;
  const fraction = used / reading.limit;
  if (reading.remaining <= 0) {
    return {
      state: "degraded",
      message: `rate limit exhausted (${used}/${reading.limit})` +
        (reading.resetAt ? `, resets ${reading.resetAt}` : ""),
    };
  }
  if (fraction >= WARN_FRACTION) {
    return {
      state: "degraded",
      message: `${Math.round(fraction * 100)}% of rate limit used (${reading.remaining} left)`,
    };
  }
  return { state: "ok" };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description:
    "X-Ratelimit-Limit / X-Ratelimit-Remaining / X-Ratelimit-Reset, read off a GET /programs/ " +
    "call. This is the only headroom signal Tapfiliate documents — there is no separate quota " +
    "or usage endpoint.",
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
      // A 403/5xx here says nothing about rate-limit headroom specifically.
      return { state: "unknown", message: `Tapfiliate returned ${res.status} for ${PROBE_PATH}` };
    }

    const reading = readRateLimitHeaders(res.headers);
    if (reading.limit === undefined || reading.remaining === undefined) {
      return {
        state: "unknown",
        message: "Tapfiliate did not return X-Ratelimit-* headers on this response",
      };
    }

    const { state, message } = stateFor(reading);
    return {
      state,
      message,
      quota: [{
        id: "requests",
        limit: reading.limit,
        remaining: reading.remaining,
        unit: "requests",
        ...(reading.resetAt ? { resetAt: reading.resetAt } : {}),
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
