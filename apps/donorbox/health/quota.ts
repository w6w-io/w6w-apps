/**
 * How much of this credential's rate-limit window is left?
 *
 * Donorbox's README never mentions a rate limit. Every response measured
 * live on 2026-09-05 — including a 401 from a garbage Basic credential —
 * carried `x-ratelimit-limit`, `x-ratelimit-remaining` and `x-ratelimit-reset`
 * (a Unix timestamp, not a delay). Three consecutive requests with different
 * invalid credentials decremented `x-ratelimit-remaining` by exactly one each
 * (60 -> 59 -> 58 -> 57), consistent with the budget being tracked per source
 * IP rather than per credential — this could not be confirmed further
 * without a working credential (API access costs $17/month; see `README.md`).
 *
 * Probe: `GET /api/v1/campaigns?per_page=1` — the same cheap, bounded read
 * the Auth `test` hook uses, so this check costs nothing beyond what
 * liveness already pays for.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Headroom is context, not a verdict — `severity: "informational"` means this never worsens a roll-up. */
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
    "Requests remaining in the current window, read off x-ratelimit-limit/x-ratelimit-remaining — " +
    "undocumented in Donorbox's own reference but present on every response measured live, " +
    "including an unauthenticated one.",
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
    // A 401 here is a credential problem, already surfaced by the derived
    // `auth:basic` check — this probe still reads the headers, since the
    // budget appears to be tracked by source IP regardless of whether the
    // request itself succeeded (see module doc).
    const limit = num(res.headers.get("x-ratelimit-limit"));
    const remaining = num(res.headers.get("x-ratelimit-remaining"));
    const resetAt = num(res.headers.get("x-ratelimit-reset"));
    if (remaining === undefined) {
      return {
        state: "unknown",
        message: `response carried no x-ratelimit-remaining header (HTTP ${res.status})`,
      };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "requests",
        limit,
        remaining,
        resetAt: resetAt !== undefined ? new Date(resetAt * 1000).toISOString() : undefined,
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
