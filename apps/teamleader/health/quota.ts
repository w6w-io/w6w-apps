/**
 * Rate-limit headroom — read from the response headers Teamleader documents
 * on every call, per `developer.focus.teamleader.eu/docs/general-principles`
 * (verified 2026-09-01):
 *
 *     x-ratelimit-limit: 200       # requests allowed per sliding minute
 *     x-ratelimit-remaining: 78    # requests left before a 429
 *     x-ratelimit-reset: 2021-06-15T10:51:23.035+0100
 *
 * This is Teamleader's ONLY metering surface — there is no separate
 * plan-consumption endpoint the way Apify or HubSpot expose one, just this
 * sliding-window request budget, scoped per (integration client id, target
 * account) pair per the vendor's own description. Reading it costs nothing
 * beyond a call this app makes anyway: `users.me`, the same request the
 * OAuth `test` hook already sends, so this check reuses its response headers
 * rather than spending a second call purely to read three headers.
 *
 * `x-ratelimit-reset` is an absolute ISO 8601 TIMESTAMP, not a delay in
 * seconds — unlike DigitalOcean's Unix-timestamp `RateLimit-Reset` (see that
 * app's README), this one is already the field shape `HealthQuota.resetAt`
 * expects, so it is passed through unparsed.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/** Remaining/limit at or below this fraction is worth flagging as degraded. */
export const WARN_FRACTION = 0.1;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description: "The sliding-window request budget from the x-ratelimit-* headers on " +
    "POST /users.me — Teamleader's only published metering surface for this API.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users.me`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: "{}",
    });

    if (!res.ok) {
      // A rejected credential says nothing about rate-limit headroom — the
      // auth `test` hook is what reports credential problems.
      return { state: "unknown", message: `Teamleader returned HTTP ${res.status} for users.me` };
    }

    const limitHeader = res.headers.get("x-ratelimit-limit");
    const remainingHeader = res.headers.get("x-ratelimit-remaining");
    const resetHeader = res.headers.get("x-ratelimit-reset");

    if (limitHeader === null || remainingHeader === null) {
      return { state: "unknown", message: "No x-ratelimit-* headers on the response" };
    }

    const limit = Number(limitHeader);
    const remaining = Number(remainingHeader);
    if (!Number.isFinite(limit) || !Number.isFinite(remaining) || limit <= 0) {
      return { state: "unknown", message: "x-ratelimit-* headers were not parseable numbers" };
    }

    const fraction = remaining / limit;
    let state: HealthState = "ok";
    let message: string | undefined;
    if (remaining <= 0) {
      state = "degraded";
      message = `Rate limit exhausted: 0/${limit} remaining until ${resetHeader ?? "reset"}`;
    } else if (fraction <= WARN_FRACTION) {
      state = "degraded";
      message = `Rate limit low: ${remaining}/${limit} remaining until ${resetHeader ?? "reset"}`;
    }

    return {
      state,
      message,
      quota: [{
        limit,
        remaining,
        resetAt: resetHeader ?? undefined,
        unit: "requests/minute",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
