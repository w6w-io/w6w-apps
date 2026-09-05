/**
 * How much of this key's rate-limit window is left?
 *
 * Unlike some vendors in this pack (Apify exposes only a ceiling, never a
 * remaining count), Ticket Tailor's OpenAPI document declares three response
 * headers by name — `X-Rate-Limit-Limit`, `X-Rate-Limit-Remaining`,
 * `X-Rate-Limit-Reset` (`components.headers`) — and a live probe on
 * 2026-09-05 confirmed all three are actually sent:
 *
 *     GET /v1/ping  ->  x-rate-limit-limit: 10000
 *                       x-rate-limit-remaining: 9995
 *                       x-rate-limit-reset: 1465
 *
 * (`ping` itself needs no credential — see `auth/api-key.ts` — so that probe
 * only shows the headers exist and decrement; it does not prove they are
 * scoped per API key rather than per IP.) `reset` is a countdown in seconds
 * until the window rolls over, not a timestamp, so it is converted to an ISO
 * `resetAt` at read time.
 *
 * This check reads the same headers off `GET /v1/overview` instead of
 * `ping`, because `overview` is signed (`credential: "signed"`) and this is
 * the connection's own quota, not the account-wide/unauthenticated figure
 * `ping` would report. If a future response ever omits the headers, this
 * reports `unknown` rather than fabricating a number — that fallback was not
 * observed live (every response in testing carried all three), but nothing
 * here assumes it can't happen.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { OVERVIEW_URL } from "../auth/api-key.ts";

/** Consumption at or above this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

export function parseRateLimitHeaders(
  headers: Headers,
): { limit?: number; remaining?: number; resetSeconds?: number } {
  const limit = headers.get("x-rate-limit-limit");
  const remaining = headers.get("x-rate-limit-remaining");
  const reset = headers.get("x-rate-limit-reset");
  return {
    limit: limit !== null && limit !== "" ? Number(limit) : undefined,
    remaining: remaining !== null && remaining !== "" ? Number(remaining) : undefined,
    resetSeconds: reset !== null && reset !== "" ? Number(reset) : undefined,
  };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description:
    "Remaining requests in the current rate-limit window, read from the X-Rate-Limit-* " +
    "response headers on GET /v1/overview.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(OVERVIEW_URL, { headers: { accept: "application/json" } });
    // A 4xx/5xx here says nothing about rate-limit headroom specifically —
    // `auth:api-key` already covers "is this credential live".
    if (!res.ok) {
      return {
        state: "unknown",
        message: `Ticket Tailor returned ${res.status} for GET /overview`,
      };
    }

    const { limit, remaining, resetSeconds } = parseRateLimitHeaders(res.headers);
    if (
      limit === undefined || remaining === undefined || !Number.isFinite(limit) ||
      !Number.isFinite(remaining)
    ) {
      return {
        state: "unknown",
        message: "Response carried no X-Rate-Limit-Limit/X-Rate-Limit-Remaining headers",
      };
    }

    const quotaReading: HealthQuota = {
      id: "requests",
      limit,
      remaining: Math.max(0, remaining),
      unit: "requests",
      ...(resetSeconds !== undefined && Number.isFinite(resetSeconds)
        ? { resetAt: new Date(Date.now() + resetSeconds * 1000).toISOString() }
        : {}),
    };

    if (limit <= 0) return { state: "ok", quota: [quotaReading], ttlSeconds: 60 };

    const fraction = 1 - remaining / limit;
    const state = fraction >= 1 ? "degraded" : fraction >= WARN_FRACTION ? "degraded" : "ok";
    return {
      state,
      message: state !== "ok"
        ? `${remaining}/${limit} requests remaining in the current window`
        : undefined,
      quota: [quotaReading],
      ttlSeconds: 60,
    };
  },
};

export default quota;
