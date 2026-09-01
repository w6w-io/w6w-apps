/**
 * How much concurrency headroom does this team have left?
 *
 * `GET /v0/teams/me` — "Returns information about the authenticated team,
 * including current concurrency usage and limits" (the OpenAPI operation's own
 * description) — is the one metered dimension Exa's public API actually
 * exposes for reading in advance: `concurrency.active`/`concurrency.queued`
 * against `limits.maxConcurrent`/`limits.maxQueued`. A null limit means
 * unlimited (per the spec's own field description), reported here as
 * unmetered rather than 100% consumed.
 *
 * **Deliberately does NOT report a credit/dollar balance.** Exa is pay-as-you-
 * go per request ($0.007-$0.015 per `/search` call, per the spec's own
 * `x-payment-info`), but no account/credits/balance endpoint exists anywhere
 * in the OpenAPI spec — the only per-request cost signal is each response's
 * own `costDollars`, after the fact, not a queryable remaining balance. That
 * absence is a separate, explicitly declared fact rather than silently
 * folded into this check — see `health/credits.ts`.
 *
 * Same endpoint as the Auth `test` hook, on purpose (mirrors Apify's
 * `auth/api-token.ts` + `health/quota.ts` pairing): it needs no scope beyond
 * an authenticated key, is not billed like the search/contents/answer
 * endpoints, and returns no credential material — the right liveness probe
 * and the only source of concurrency headroom, from the same read.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

export const TEAM_URL = `${API_URL}/v0/teams/me`;

/** Consumption at or above this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

interface TeamInfo {
  concurrency?: { active?: number; queued?: number };
  limits?: { maxConcurrent?: number | null; maxQueued?: number | null };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Concurrency headroom",
  description:
    "Active/queued request concurrency against this team's limits, from GET /v0/teams/me.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(TEAM_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Exa returned ${res.status} for /v0/teams/me` };
    }

    const body = await res.json().catch(() => null) as TeamInfo | null;
    const concurrency = body?.concurrency;
    const limits = body?.limits;
    if (!concurrency || !limits) {
      return { state: "unknown", message: "Team info response carried no concurrency/limits" };
    }

    const quotas: HealthQuota[] = [];
    const notes: string[] = [];
    let worst: "ok" | "degraded" = "ok";

    const dims: Array<{ id: string; used?: number; limit?: number | null }> = [
      { id: "concurrent-requests", used: concurrency.active, limit: limits.maxConcurrent },
      { id: "queued-requests", used: concurrency.queued, limit: limits.maxQueued },
    ];

    for (const dim of dims) {
      if (typeof dim.used !== "number") continue;
      // A null/undefined limit means "unlimited", not "unmetered" in the sense
      // of unknown — still worth reporting the current usage figure.
      if (typeof dim.limit !== "number") {
        quotas.push({ id: dim.id, remaining: undefined, unit: "requests" });
        continue;
      }
      const remaining = Math.max(0, dim.limit - dim.used);
      quotas.push({ id: dim.id, limit: dim.limit, remaining, unit: "requests" });
      if (dim.limit > 0 && dim.used / dim.limit >= WARN_FRACTION) {
        worst = "degraded";
        notes.push(`${dim.id} at ${dim.used}/${dim.limit}`);
      }
    }

    if (quotas.length === 0) {
      return { state: "unknown", message: "Team info response carried no readable dimension" };
    }

    return {
      state: worst,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      quota: quotas,
      ttlSeconds: 60,
    };
  },
};

export default quota;
