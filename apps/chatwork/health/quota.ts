import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_BASE, formatChatworkError } from "../lib/client.ts";

/**
 * How much of the per-token rate-limit window is left?
 *
 * Every successful Chatwork response carries `X-RateLimit-Limit`,
 * `X-RateLimit-Remaining` and `X-RateLimit-Reset` (Unix seconds) — confirmed
 * against the vendor's own header components in its OpenAPI document (fetched
 * 2026-08-29). This is the **only** quota surface Chatwork publishes: there is
 * no separate plan/usage endpoint the way some vendors expose one, so the
 * headers on an ordinary read are the entire signal.
 *
 * ## Same call as the credential probe, on purpose
 *
 * `auth/api-token.ts` also calls `GET /me`. That is deliberate: it is the
 * cheapest authenticated read in the surface and it is guaranteed to carry
 * the rate-limit headers on success, so one call answers both "is the token
 * live?" and "how much headroom is left?" without a second round trip.
 *
 * These headers are **absent from error responses** — confirmed live against
 * an unauthenticated `GET /me`, which returned no `X-RateLimit-*` headers at
 * all alongside its 401. A non-2xx here therefore reports `unknown` rather
 * than treating a missing header as zero headroom.
 */
export const PROBE_PATH = "/me";
export const WARN_FRACTION = 0.1;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description:
    "Requests remaining in the current window, read from the X-RateLimit-* headers on GET /me.",
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
      const raw = await res.text().catch(() => "");
      return {
        state: "unknown",
        message: formatChatworkError(res.status, "GET", PROBE_PATH, raw),
      };
    }

    const limitHeader = res.headers.get("x-ratelimit-limit");
    const remainingHeader = res.headers.get("x-ratelimit-remaining");
    const resetHeader = res.headers.get("x-ratelimit-reset");
    const limit = limitHeader ? Number(limitHeader) : undefined;
    const remaining = remainingHeader ? Number(remainingHeader) : undefined;

    if (
      limit === undefined || remaining === undefined || Number.isNaN(limit) ||
      Number.isNaN(remaining)
    ) {
      return {
        state: "unknown",
        message: "GET /me succeeded but carried no X-RateLimit-* headers",
      };
    }

    const resetAt = resetHeader && !Number.isNaN(Number(resetHeader))
      ? new Date(Number(resetHeader) * 1000).toISOString()
      : undefined;
    const q: HealthQuota = { limit, remaining, unit: "requests", ...(resetAt ? { resetAt } : {}) };

    const fraction = limit > 0 ? remaining / limit : 1;
    if (remaining <= 0) {
      return {
        state: "down",
        message: `Rate limit exhausted (0/${limit})`,
        quota: [q],
        ttlSeconds: 60,
      };
    }
    if (fraction <= WARN_FRACTION) {
      return {
        state: "degraded",
        message: `Rate limit low: ${remaining}/${limit} remaining`,
        quota: [q],
        ttlSeconds: 60,
      };
    }
    return { state: "ok", quota: [q], ttlSeconds: 60 };
  },
};

export default quota;
