/**
 * How much of this connection's per-minute Clio rate limit is left?
 *
 * Per Clio's own Rate Limits guide, EVERY response — success or 4xx — carries
 * three headers: `X-RateLimit-Limit` (max requests in the current 60-second
 * window), `X-RateLimit-Remaining` (requests left in that window) and
 * `X-RateLimit-Reset` (a Unix timestamp for when the window resets). The
 * default is 50 requests/minute during each region's own peak hours and
 * higher off-peak — the vendor states plainly that the number "may change
 * without notice" and that the headers, not a hard-coded constant, are the
 * only thing an integration should trust.
 *
 * ## Why this reads `users/who_am_i.json`, and why a 401 reports `unknown`
 *
 * Measured live on 2026-08-24: an unauthenticated request (no `Authorization`
 * header, or a syntactically invalid one) carries NONE of the three
 * `X-RateLimit-*` headers — rate limiting is scoped to a live access token,
 * and a request that never reaches token verification has no per-token
 * bucket to report against. So a `401` here means "cannot read quota", not
 * "quota exhausted", and is reported `unknown` rather than `degraded`. The
 * same whoami endpoint the `oauth2` Auth methods use for `test` is reused
 * here (signed, so it always exercises the real per-token bucket) rather than
 * adding a second probe purely to read three headers.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { apiBase } from "../lib/client.ts";

/** Consumption at or above this fraction of the window's limit is worth flagging. */
export const WARN_FRACTION = 0.9;

function isoFromUnixSeconds(value: string | null): string | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return undefined;
  return new Date(seconds * 1000).toISOString();
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate limit headroom",
  description: "X-RateLimit-Limit / -Remaining / -Reset from a signed GET /users/who_am_i.json, " +
    "read for their headers only.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 30,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${apiBase(ctx)}/users/who_am_i.json?fields=id`, {
      headers: { accept: "application/json" },
    });

    // Rate-limit headers are scoped to a live token; a 401 has none to read.
    if (res.status === 401) {
      await res.body?.cancel();
      return { state: "unknown", message: "Clio returned 401 — cannot read the per-token limit" };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "unknown", message: `Clio returned ${res.status} for /users/who_am_i.json` };
    }
    await res.body?.cancel();

    const limitHeader = res.headers.get("x-ratelimit-limit");
    const remainingHeader = res.headers.get("x-ratelimit-remaining");
    const resetHeader = res.headers.get("x-ratelimit-reset");
    const limit = limitHeader ? Number(limitHeader) : undefined;
    const remaining = remainingHeader ? Number(remainingHeader) : undefined;

    if (limit === undefined || remaining === undefined) {
      return { state: "unknown", message: "response carried no X-RateLimit-* headers" };
    }

    const fraction = limit > 0 ? 1 - remaining / limit : 0;
    let state: HealthState = "ok";
    let message: string | undefined;
    if (limit > 0 && remaining <= 0) {
      state = "degraded";
      message = `rate limit exhausted for this window: 0/${limit} remaining`;
    } else if (fraction >= WARN_FRACTION) {
      state = "degraded";
      message = `${remaining}/${limit} requests remaining in this 60s window`;
    }

    return {
      state,
      message,
      quota: [{
        id: "requests-per-minute",
        limit,
        remaining,
        unit: "requests",
        resetAt: isoFromUnixSeconds(resetHeader),
      }],
      ttlSeconds: 30,
    };
  },
};

export default quota;
