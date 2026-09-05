/**
 * How much of this API key's rate-limit budget is left, right now?
 *
 * ## The vendor's own prose undersells what is actually on the wire
 *
 * Heartbeat's "Request limits" page states only: "API keys are limited to at
 * most 10 requests per second. Rate-limited requests will return a HTTP
 * response status 429." No header is documented at all.
 *
 * Measured live against `api.heartbeat.chat/v0/users` on 2026-09-05 (both an
 * authenticated and an unauthenticated call): every response — including the
 * 401 — carries `x-ratelimit-limit: 20`, `x-ratelimit-remaining`, and
 * `x-ratelimit-reset` (a Unix-seconds timestamp measured **~2 seconds** ahead
 * of the request). A limit of 20 over a rolling ~2-second window averages to
 * exactly the documented 10/second — but reading `x-ratelimit-limit` at face
 * value as a per-second ceiling overstates the real burst budget by 2x, which
 * is the detail this check exists to get right rather than repeat the vendor's
 * rounded prose.
 *
 * ## Same endpoint as the credential probe, on purpose
 *
 * `auth/api-key.ts` probes `GET /v0/roles` for the same reason this check
 * reads it: it needs a credential, takes no parameters, and returns nothing
 * about a specific person. Reusing it here costs nothing extra against the
 * budget this check is itself reporting on.
 *
 * ## Reading headers survives a 401 the JSON client would otherwise discard
 *
 * `lib/client.ts`'s `HeartbeatClient` throws on a non-2xx response rather than
 * handing the caller the `Response`, which would throw away exactly the
 * headers this check needs on the one response that matters most (the moment
 * a key gets rejected mid-burst). This check calls `ctx.fetch` directly for
 * that reason — the request is still signed, because `credential: "signed"`
 * routes it through the same `sign` hook an Action's `ctx.fetch` call would.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_BASE, API_PREFIX, readRateLimitHeaders } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

/** Consumption at or above this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description:
    "Reads x-ratelimit-limit/remaining/reset off GET /v0/roles. Heartbeat documents only " +
    '"10 requests/second"; the headers reveal the real window is a rolling ~2 seconds ' +
    "(limit 20 over 2s = 10/s average).",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 30,

  async check(_input, ctx) {
    const url = `${API_BASE}${API_PREFIX}${PROBE_PATH}`;
    const res = await ctx.fetch(url, { headers: { accept: "application/json" } });
    const rl = readRateLimitHeaders(res.headers);

    if (!res.ok) {
      // A 401 here is `auth:api-key`'s finding to report, not this check's —
      // Heartbeat stamps the same rate-limit headers on a rejected request, so
      // reporting quota state off it would conflate "key is bad" with "budget
      // is low".
      return {
        state: "unknown",
        message: `Heartbeat returned ${res.status} for ${PROBE_PATH}`,
      };
    }
    if (rl.limit === undefined || rl.remaining === undefined) {
      return { state: "unknown", message: "Response carried no x-ratelimit-* headers" };
    }

    const used = rl.limit - rl.remaining;
    const fraction = rl.limit > 0 ? used / rl.limit : 0;
    const resetAt = rl.reset !== undefined ? new Date(rl.reset * 1000).toISOString() : undefined;
    const q: HealthQuota = {
      id: "requests-per-2s",
      limit: rl.limit,
      remaining: Math.max(0, rl.remaining),
      unit: "requests",
      ...(resetAt ? { resetAt } : {}),
    };

    if (fraction >= 1) {
      return {
        state: "degraded",
        message: `rate limit exhausted (${used}/${rl.limit} requests in the current window)`,
        quota: [q],
        ttlSeconds: 15,
      };
    }
    if (fraction >= WARN_FRACTION) {
      return {
        state: "degraded",
        message: `rate limit at ${used}/${rl.limit} requests (${Math.round(fraction * 100)}%) ` +
          "in the current ~2s window",
        quota: [q],
        ttlSeconds: 15,
      };
    }
    return { state: "ok", quota: [q], ttlSeconds: 15 };
  },
};

export default quota;
