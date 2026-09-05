/**
 * How much of this account's JustCall rate limit is left?
 *
 * ## A real, documented, per-response signal
 *
 * `docs/rate-limits.md` documents six response headers on every JustCall API
 * response, covering two independent windows:
 *
 *  - **Hourly**: `X-Rate-Limit-Limit`, `X-Rate-Limit-Remaining`,
 *    `X-Rate-Limit-Reset` (Unix epoch seconds).
 *  - **Burst (per-minute)**: `X-Rate-Limit-Burst-Limit`,
 *    `X-Rate-Limit-Burst-Remaining`, `X-Rate-Limit-Burst-Reset`.
 *
 * The ceilings themselves are plan-dependent (1,800/hr + 30/min on Team, up to
 * 5,400/hr + 90/min on Business/SalesPro) — this check reads the account's own
 * numbers off the headers rather than hard-coding a plan table that would drift.
 *
 * ## What could not be confirmed live, and why this check degrades instead of guessing
 *
 * This app has no test account, so these headers were probed against
 * `api.justcall.io` only **unauthenticated** and with a **fabricated**
 * credential (2026-09-05) — both answered `401` with **neither header pair
 * present**. The vendor's own doc says the headers appear "in every request",
 * which unauthenticated requests plausibly are not (there is no account to
 * meter). Since this cannot be confirmed against a real 200, the check treats a
 * response carrying neither pair as `unknown` rather than as "zero quota" —
 * reporting `down` from an absent header would be one bad guess away from
 * paging someone over a header this app never actually saw.
 *
 * ## Piggybacking on the auth probe's own call
 *
 * This check hits the same `GET /v2.1/users?per_page=1` the credential probe
 * uses (see `auth/api-key.ts`), for the same reason apify's `quota` check reuses
 * its own auth probe: it is the cheapest already-justified authenticated call in
 * this app's surface, so headroom reporting costs no second request.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE, API_PREFIX, type RateLimitWindow, readRateLimitHeaders } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

export const QUOTA_URL = `${API_BASE}${API_PREFIX}${PROBE_PATH}?per_page=1`;

/** Remaining at or below this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.1;

export interface WindowReading {
  quota: HealthQuota;
  state: HealthState;
  note?: string;
}

/**
 * Turn one rate-limit window into a quota reading plus the state it implies.
 *
 * Exported so the arithmetic is testable without a fetch. The burst window
 * recovers within a minute on its own, so exhausting it is a queue, never worse
 * than `degraded`; the hourly window exhausting means the account is locked out
 * for up to an hour, which is `down`.
 */
export function readWindow(
  id: string,
  window: RateLimitWindow,
  fatal: boolean,
): WindowReading {
  const quota: HealthQuota = {
    id,
    limit: window.limit,
    remaining: Math.max(0, window.remaining),
    unit: "requests",
    ...(window.reset > 0 ? { resetAt: new Date(window.reset * 1000).toISOString() } : {}),
  };

  if (window.limit <= 0) return { quota, state: "ok" };
  const fraction = window.remaining / window.limit;

  if (fraction <= 0) {
    return {
      quota,
      state: fatal ? "down" : "degraded",
      note: `${id} exhausted (0/${window.limit} remaining)`,
    };
  }
  if (fraction <= WARN_FRACTION) {
    return {
      quota,
      state: "degraded",
      note: `${id} at ${window.remaining}/${window.limit} remaining (${
        Math.round(fraction * 100)
      }%)`,
    };
  }
  return { quota, state: "ok" };
}

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description:
    "Hourly and per-minute (burst) request headroom, read from the X-Rate-Limit-* response " +
    "headers on GET /v2.1/users?per_page=1.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(QUOTA_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A 401/403 here says nothing about headroom — that is the auth check's job.
      return { state: "unknown", message: `JustCall returned ${res.status} for ${PROBE_PATH}` };
    }

    const { hourly, burst } = readRateLimitHeaders(res.headers);
    if (!hourly && !burst) {
      return {
        state: "unknown",
        message: "JustCall did not return X-Rate-Limit headers on this response",
      };
    }

    const quotas: HealthQuota[] = [];
    const notes: string[] = [];
    let state: HealthState = "ok";

    if (hourly) {
      const reading = readWindow("hourly-requests", hourly, true);
      quotas.push(reading.quota);
      if (reading.note) notes.push(reading.note);
      if (RANK[reading.state] > RANK[state]) state = reading.state;
    }
    if (burst) {
      const reading = readWindow("burst-requests-per-minute", burst, false);
      quotas.push(reading.quota);
      if (reading.note) notes.push(reading.note);
      if (RANK[reading.state] > RANK[state]) state = reading.state;
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      quota: quotas,
      ttlSeconds: 60,
    };
  },
};

export default quota;
