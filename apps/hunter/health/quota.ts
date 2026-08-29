/**
 * How much of this account's monthly Hunter allowance is left?
 *
 * `GET /v2/account` — the same free, credential-scoped call `auth/api-key.ts`
 * uses to probe liveness — returns `data.requests`, three metered buckets:
 *
 *   - `credits`   — the unified spend counter (searches + verifications
 *     combined into one figure on newer plans).
 *   - `searches`  — Domain Search, Email Finder, Domain Finder and the
 *     Enrichment endpoints all draw from this bucket.
 *   - `verifications` — Email Verifier draws from this one alone.
 *
 * Each entry carries `used`, `available` (the period allocation *plus* any
 * extra credit packs — it does not shrink as the month is consumed) and
 * `remaining` (the live balance, matching the dashboard). `remaining` is what
 * a workflow scheduling a bulk run actually needs, which is why the
 * `HealthQuota.remaining` field is read from it rather than computed from
 * `available - used`.
 *
 * No response in this app's surface carries a rate-limit header of any kind
 * (verified against every endpoint section of the v2 reference, 2026-08-29),
 * so unlike a per-second/per-minute ceiling, this is the only headroom signal
 * Hunter exposes at all — there is no separate `request-rate` check to add.
 *
 * `severity: "informational"`: running low is worth surfacing and never worth
 * failing a verdict over — Hunter's own 429 response ("Too many requests")
 * already tells a caller precisely when a run has to stop.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

interface AccountBucket {
  used?: number;
  available?: number;
  remaining?: number;
}

interface AccountBody {
  data?: {
    requests?: {
      credits?: AccountBucket;
      searches?: AccountBucket;
      verifications?: AccountBucket;
    };
  };
}

/** Below this fraction of `available` remaining, the bucket is worth flagging. */
export const WARN_FRACTION = 0.1;

/**
 * Turn one bucket into a quota reading plus the state it implies.
 *
 * Exported so the arithmetic is testable without a fetch. A missing or
 * non-positive `available` means "not metered on this plan" rather than
 * "exhausted" — reading it the other way would report every unlimited bucket
 * as out of headroom.
 */
export function readBucket(id: string, bucket: AccountBucket | undefined):
  | { quota: HealthQuota; state: HealthState; note?: string }
  | undefined {
  if (!bucket || typeof bucket.remaining !== "number") return undefined;
  const { remaining, available } = bucket;

  const quota: HealthQuota = {
    id,
    remaining,
    unit: "requests",
    ...(available ? { limit: available } : {}),
  };

  if (remaining <= 0) {
    return { quota, state: "down", note: `${id}: 0 remaining` };
  }
  if (typeof available === "number" && available > 0 && remaining / available < WARN_FRACTION) {
    return {
      quota,
      state: "degraded",
      note: `${id}: ${remaining}/${available} remaining (${
        Math.round((remaining / available) * 100)
      }%)`,
    };
  }
  return { quota, state: "ok" };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Search / verification headroom",
  description:
    "Credits, searches and verifications used/available/remaining for the current billing " +
    "period, read from GET /v2/account.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/account`, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Hunter returned ${res.status} for /account` };

    const body = await res.json().catch(() => null) as AccountBody | null;
    const requests = body?.data?.requests;
    if (!requests) {
      return { state: "unknown", message: "account response carried no requests data" };
    }

    const quotas: HealthQuota[] = [];
    const notes: string[] = [];
    let state: HealthState = "ok";

    for (const [id, bucket] of Object.entries(requests)) {
      const reading = readBucket(id, bucket);
      if (!reading) continue;
      quotas.push(reading.quota);
      if (reading.note) notes.push(reading.note);
      if (RANK[reading.state] > RANK[state]) state = reading.state;
    }

    if (quotas.length === 0) {
      return { state: "unknown", message: "account response carried no known request buckets" };
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      quota: quotas,
      ttlSeconds: 60,
    };
  },
};

export default quota;
