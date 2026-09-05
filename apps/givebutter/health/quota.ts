/**
 * How much of this credential's rate-limit window is left?
 *
 * ## Trust the header, not the docs page
 *
 * `docs.givebutter.com/api-reference/rate-limits` states: "The Givebutter API
 * is rate limited to 500 requests per minute." Every response measured live
 * on 2026-09-05 — signed and unsigned, 401 and 200 alike — carried
 * `x-ratelimit-limit: 200`, decrementing by exactly one per request via
 * `x-ratelimit-remaining`. No `x-ratelimit-reset` or `Retry-After` header was
 * present on any successful or 401 response observed (the docs page mentions
 * `Retry-After` only for an actual 429, which was not deliberately triggered).
 * This check reports the header's own number rather than the documented one.
 *
 * Probe: `GET /v1/campaigns?per_page=1` — the same cheap, bounded read the
 * auth `test` hook uses, so this check costs nothing beyond what liveness
 * already pays for.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up.
 */
function headroom(remaining?: number, limit?: number): HealthState {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Requests remaining in the current window, read off x-ratelimit-limit/x-ratelimit-remaining. " +
    "The vendor's Rate Limits doc page states 500 req/min; every response measured live carried " +
    "a limit of 200 — this check reports the header, not the doc.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/campaigns?per_page=1`, {
      headers: { accept: "application/json" },
    });
    // A 401/403 here is a credential problem, already surfaced by the derived
    // `auth:api-key` check — this probe still reads the headers, since
    // Givebutter's rate-limit counter is per-credential/IP regardless of
    // whether the request itself succeeded.
    const limit = num(res.headers.get("x-ratelimit-limit"));
    const remaining = num(res.headers.get("x-ratelimit-remaining"));
    if (remaining === undefined) {
      return {
        state: "unknown",
        message: `response carried no x-ratelimit-remaining header (HTTP ${res.status})`,
      };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{ id: "requests", limit, remaining, unit: "requests" }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
