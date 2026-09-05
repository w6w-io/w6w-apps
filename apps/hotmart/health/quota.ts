/**
 * How much of Hotmart's per-minute rate limit is left?
 *
 * Hotmart documents a flat 500 requests/minute ceiling (read + write
 * combined) at `developers.hotmart.com/docs/en/start/rate-limit/`, carried on
 * responses via `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset`
 * plus the legacy `X-RateLimit-Limit-Minute` / `X-RateLimit-Remaining-Minute`
 * pair. There is no separate plan/usage endpoint the way some vendors expose
 * one — the headers on an ordinary authenticated read are the entire signal.
 *
 * ## Verified live: the headers are documented, but were not observed on an
 * unauthenticated call
 *
 * `GET /user/api/v1/me` unauthenticated on 2026-09-05 returned its documented
 * 401 body with **no** `RateLimit-*`/`X-RateLimit-*` headers of any kind.
 * That is consistent with Hotmart only attaching them to a fully
 * authenticated, successfully routed request — this app has no test
 * credential to confirm that positively — so a response that lacks them is
 * read as "not observed", never as "zero headroom". `readHeaders` below is
 * exported precisely so that reading is exercised without a live credential.
 *
 * ## Same call as the credential probe, on purpose
 *
 * `auth/client-credentials.ts`'s `test` re-runs the token exchange rather
 * than reading `/user/api/v1/me`, so this check makes its own call instead of
 * reusing that one — but it is still the cheapest authenticated read in the
 * surface, and it is the same request `auth/client-credentials.ts`'s
 * `afterConnect` makes for the connection label.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_BASE, USER_PREFIX } from "../lib/client.ts";

export const PROBE_PATH = `${USER_PREFIX}/me`;

/** Consumption at or above this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.1;

export interface HeaderReading {
  limit?: number;
  remaining?: number;
  resetAt?: string;
}

/**
 * Read the rate-limit headers off a `Response`, preferring the modern
 * `RateLimit-*` trio and falling back to the legacy `X-RateLimit-*-Minute`
 * pair Hotmart's docs also document. Exported so the parsing is unit-testable
 * without a live authenticated call.
 */
export function readHeaders(headers: Headers): HeaderReading {
  const limitHeader = headers.get("ratelimit-limit") ?? headers.get("x-ratelimit-limit-minute");
  const remainingHeader = headers.get("ratelimit-remaining") ??
    headers.get("x-ratelimit-remaining-minute");
  const resetHeader = headers.get("ratelimit-reset");

  const limit = limitHeader ? Number(limitHeader) : undefined;
  const remaining = remainingHeader ? Number(remainingHeader) : undefined;
  const out: HeaderReading = {};
  if (typeof limit === "number" && !Number.isNaN(limit)) out.limit = limit;
  if (typeof remaining === "number" && !Number.isNaN(remaining)) out.remaining = remaining;
  if (resetHeader && !Number.isNaN(Number(resetHeader))) {
    // `RateLimit-Reset` is documented as "time remaining", i.e. a delay in
    // seconds, not a Unix timestamp — unlike some vendors' reset headers.
    out.resetAt = new Date(Date.now() + Number(resetHeader) * 1000).toISOString();
  }
  return out;
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description:
    "Requests remaining in the current minute, read from the RateLimit-*/X-RateLimit-*-Minute " +
    `headers on GET ${PROBE_PATH}.`,
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      // A failed probe says nothing about headroom specifically — it is
      // covered separately by the derived `auth:client-credentials` check.
      return { state: "unknown", message: `Hotmart returned ${res.status} for ${PROBE_PATH}` };
    }

    const { limit, remaining, resetAt } = readHeaders(res.headers);
    if (limit === undefined || remaining === undefined) {
      return {
        state: "unknown",
        message: `${PROBE_PATH} succeeded but carried no rate-limit headers`,
      };
    }

    const q: HealthQuota = { limit, remaining, unit: "requests", ...(resetAt ? { resetAt } : {}) };
    const fraction = limit > 0 ? remaining / limit : 1;

    if (remaining <= 0) {
      return {
        state: "down",
        message: `Rate limit exhausted (0/${limit} per minute)`,
        quota: [q],
        ttlSeconds: 60,
      };
    }
    if (fraction <= WARN_FRACTION) {
      return {
        state: "degraded",
        message: `Rate limit low: ${remaining}/${limit} remaining this minute`,
        quota: [q],
        ttlSeconds: 60,
      };
    }
    return { state: "ok", quota: [q], ttlSeconds: 60 };
  },
};

export default quota;
