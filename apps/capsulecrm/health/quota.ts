/**
 * How much rate-limit headroom is left on THIS credential.
 *
 * Verified against `overview/handling-api-responses`'s "Working within API
 * rate limits" section: every successful response carries `X-RateLimit-Limit`,
 * `X-RateLimit-Remaining` and `X-RateLimit-Reset` (Unix epoch seconds). The
 * budget is 4,000 requests/hour **per Capsule user**, not per application —
 * a second integration authenticated as the same user shares this budget.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness (the derived
 *     `auth:*` check) or platform status (`service`).
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct: the allowance belongs to the user the
 *     token was minted for. Signing is safe because the probe stays on the
 *     app's own egress allowlist (`api.capsulecrm.com`).
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /users/current`, the same scope-free whoami the auth `test`
 * hook uses, so one request answers both "is the token live?" and "how much
 * headroom is left?" when both checks happen to run close together.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const headroom = (remaining?: number, limit?: number): HealthState => {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Per-user hourly allowance remaining, read off the X-RateLimit-* headers on the whoami probe.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/current`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const limit = num(h.get("x-ratelimit-limit"));
    const remaining = num(h.get("x-ratelimit-remaining"));
    const resetAt = num(h.get("x-ratelimit-reset"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no X-RateLimit-* headers" };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "user",
        limit,
        remaining,
        unit: "requests",
        resetAt: resetAt !== undefined ? new Date(resetAt * 1000).toISOString() : undefined,
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
