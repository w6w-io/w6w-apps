/**
 * How much of the 300-calls-per-minute budget is left?
 *
 * `docs.lemonsqueezy.com/api/getting-started/requests` states the ceiling
 * plainly — "There is a limit of 300 API calls per minute" — and documents two
 * response headers on every SUCCESSFUL response: `X-Ratelimit-Limit` and
 * `X-Ratelimit-Remaining`. A `429 Too Many Requests` is returned once it is
 * exceeded.
 *
 * **Caveat, stated rather than hidden:** this app was built without a live
 * Lemon Squeezy API key, so the header pair above is transcribed from the
 * vendor's documentation and could not be confirmed on an authenticated
 * response (an unauthenticated probe against `/v1/users/me` carries neither
 * header, confirmed 2026-09-05 — consistent with the docs saying they ride
 * only on success). If a live account shows different header names or casing,
 * this check degrades to `unknown` rather than misreporting, since header
 * lookups here are case-insensitive (`Headers.get`) and a missing pair is
 * treated as "not present" rather than "zero remaining".
 *
 * Reuses the same `GET /v1/users/me` call the auth probe uses — cheap,
 * requires no permission beyond a valid key, and returns no data beyond the
 * caller's own profile.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL, JSON_API_TYPE } from "../lib/client.ts";

export const QUOTA_URL = `${API_URL}/users/me`;

/** Remaining/limit at or below this fraction is worth flagging. */
export const WARN_FRACTION = 0.1;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description: "Reads the documented X-Ratelimit-Limit / X-Ratelimit-Remaining headers off a " +
    "signed GET /v1/users/me call. 300 calls/minute is the account-wide ceiling.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(QUOTA_URL, {
      headers: { accept: JSON_API_TYPE, "content-type": JSON_API_TYPE },
    });
    if (!res.ok) {
      // A 401/403 here says the credential is bad, not that quota is gone —
      // the derived `auth:api-key` check already reports that separately.
      return { state: "unknown", message: `Lemon Squeezy returned ${res.status} for /users/me` };
    }

    const limitHeader = res.headers.get("x-ratelimit-limit");
    const remainingHeader = res.headers.get("x-ratelimit-remaining");
    const limit = limitHeader === null ? undefined : Number(limitHeader);
    const remaining = remainingHeader === null ? undefined : Number(remainingHeader);

    if (
      limit === undefined || remaining === undefined || Number.isNaN(limit) ||
      Number.isNaN(remaining)
    ) {
      return {
        state: "unknown",
        message: "Response carried no X-Ratelimit-Limit/X-Ratelimit-Remaining headers",
      };
    }

    const quotaReading = { limit, remaining, unit: "requests/minute" };
    if (limit <= 0) return { state: "ok", quota: [quotaReading], ttlSeconds: 60 };

    const fraction = remaining / limit;
    if (fraction <= 0) {
      return {
        state: "down",
        message: `Rate limit exhausted (${remaining}/${limit} remaining)`,
        quota: [quotaReading],
        ttlSeconds: 60,
      };
    }
    if (fraction <= WARN_FRACTION) {
      return {
        state: "degraded",
        message: `Rate limit nearly exhausted (${remaining}/${limit} remaining)`,
        quota: [quotaReading],
        ttlSeconds: 60,
      };
    }
    return { state: "ok", quota: [quotaReading], ttlSeconds: 60 };
  },
};

export default quota;
