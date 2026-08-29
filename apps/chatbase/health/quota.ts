import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_BASE, readRateLimit } from "../lib/client.ts";
import { PROBE_PATH as AGENTS_PATH } from "../auth/api-key.ts";

/**
 * Request-rate headroom, read from the same headers every v2 response
 * carries.
 *
 * ## What this covers, and what it doesn't
 *
 * Chatbase meters two unrelated things, and only one is readable in advance:
 *
 *  1. **Request rate** — "100 requests per 10-second sliding window, scoped
 *     per API key and IP" (`/docs/api-v2/authentication`). Every response
 *     carries `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and
 *     `X-RateLimit-Reset` (Unix **milliseconds**). This check reads it.
 *  2. **Message credits** — the workspace's plan allowance for chat
 *     responses. There is no endpoint that reads a credit balance in
 *     advance; it only surfaces as `CHAT_CREDITS_EXHAUSTED` /
 *     `CHAT_AGENT_CREDITS_EXHAUSTED` **at chat time**. That half is not
 *     represented here — a `quota` check that can only ever say "unknown"
 *     for it would be noise, not signal.
 *
 * A ten-second window recovers on its own, so this never reports worse than
 * `degraded` — unlike a monthly ceiling, there is nothing here a workflow
 * cannot simply wait out.
 *
 * ## Why `/agents?limit=1`
 *
 * Any signed v2 call carries the headers, so the cheapest read in this app's
 * surface is used rather than a dedicated probe — the same call
 * `auth/api-key.ts` uses for credential liveness. `minIntervalSeconds` below
 * keeps this from becoming a second call on top of that one in practice.
 */
export const WARN_FRACTION = 0.9;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request-rate headroom",
  description:
    "Reads X-RateLimit-Limit / X-RateLimit-Remaining / X-RateLimit-Reset from GET /agents?limit=1 " +
    "— present on every v2 response. Chatbase's other quota, message credits, has no readable " +
    "balance endpoint and only surfaces as an error at chat time.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${AGENTS_PATH}?limit=1`, {
      headers: { accept: "application/json" },
    });
    // A 401/403 says nothing about rate-limit headroom — that's auth:api-key's job.
    if (!res.ok && res.status !== 429) {
      await res.body?.cancel();
      return { state: "unknown", message: `Chatbase returned ${res.status} for ${AGENTS_PATH}` };
    }

    const info = readRateLimit(res);
    if (typeof info.limit !== "number" || typeof info.remaining !== "number") {
      return { state: "unknown", message: "response carried no X-RateLimit-* headers" };
    }

    const remainingQuota: HealthQuota = {
      id: "requests-per-10s",
      limit: info.limit,
      remaining: Math.max(0, info.remaining),
      unit: "requests",
      ...(info.resetAt ? { resetAt: info.resetAt } : {}),
    };

    if (res.status === 429 || info.remaining <= 0) {
      return {
        state: "degraded",
        message: `rate limit exhausted (0/${info.limit}); retry after ${
          info.retryAfterSeconds ?? "a few"
        }s`,
        quota: [remainingQuota],
        ttlSeconds: 10,
      };
    }

    const fraction = 1 - info.remaining / info.limit;
    if (fraction >= WARN_FRACTION) {
      return {
        state: "degraded",
        message: `${info.remaining}/${info.limit} requests left in the current 10s window`,
        quota: [remainingQuota],
        ttlSeconds: 10,
      };
    }

    return {
      state: "ok",
      quota: [remainingQuota],
      ttlSeconds: 10,
    };
  },
};

export default quota;
