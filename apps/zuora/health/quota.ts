import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { baseUrlFromConnection } from "../lib/client.ts";

/**
 * Rate-limit headroom, read off the same cheap call the `auth:client-credentials`
 * check already makes — verified 2026-09-05 against the "Rate limits" guide
 * (`developer.zuora.com/docs/guides/rate-limits`).
 *
 * Every response carries three headers:
 *
 * - `ratelimit-limit`: a comma-separated list, one entry per window closest to
 *   exhaustion — e.g. `50000;w=60, 2250000;w=3600, 27000000;w=86400` (RPM, RPH,
 *   RPD). This check reports the `w=60` (per-minute) entry, since that is the
 *   window a bursty workflow run actually hits.
 * - `ratelimit-remaining`: requests left before a 429, for the tightest window.
 * - `ratelimit-reset`: SECONDS until that window resets (not a timestamp).
 *
 * These are TENANT-level limits, not per-connection — the same OAuth client
 * hitting several regions from this app would still share one tenant's
 * budget. Reported at `informational` severity: a low remaining count is
 * useful to know but is not, by itself, evidence anything is broken — a
 * legitimately busy tenant looks the same as a runaway workflow.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  severity: "informational",
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const base = baseUrlFromConnection(ctx.connection);
    let res: Response;
    try {
      res = await ctx.fetch(`${base}/object-query/accounts?pageSize=1`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "unknown", message: `could not reach ${base}: ${String(err)}` };
    }
    await res.body?.cancel();

    const limitHeader = res.headers.get("ratelimit-limit");
    const remainingHeader = res.headers.get("ratelimit-remaining");
    const resetHeader = res.headers.get("ratelimit-reset");
    if (!limitHeader || !remainingHeader) {
      return {
        state: "unknown",
        message: "Zuora did not return `ratelimit-*` headers on this response",
      };
    }

    // Pick the per-minute (`w=60`) entry out of the comma-separated list;
    // fall back to the first entry if the window annotation is missing.
    const entries = limitHeader.split(",").map((s) => s.trim());
    const perMinute = entries.find((e) => /w=60\b/.test(e)) ?? entries[0];
    const limit = Number(perMinute.split(";")[0]);
    const remaining = Number(remainingHeader);
    const resetSeconds = resetHeader ? Number(resetHeader) : undefined;

    const ratio = Number.isFinite(limit) && limit > 0 ? remaining / limit : 1;
    const state: HealthState = ratio < 0.05 ? "degraded" : "ok";

    return {
      state,
      message: `${remaining} of ${Number.isFinite(limit) ? limit : "?"} requests remaining this ` +
        `minute${resetSeconds !== undefined ? `, resets in ${resetSeconds}s` : ""}`,
      quota: [{
        id: "requests-per-minute",
        limit: Number.isFinite(limit) ? limit : undefined,
        remaining: Number.isFinite(remaining) ? remaining : undefined,
        resetAt: resetSeconds !== undefined
          ? new Date(Date.now() + resetSeconds * 1000).toISOString()
          : undefined,
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
