/**
 * How much of this account's Bland credit balance is left?
 *
 * ## Why `/v1/me` and not a dedicated quota endpoint
 *
 * Bland has no separate rate-limit surface: a live 401 probe against
 * `GET /v1/me` (2026-08-29) carries no `X-RateLimit-*`/`RateLimit-*` header of
 * any kind. What Bland does expose is `billing.current_balance` on
 * `GET /v1/me` — the account's remaining pay-as-you-go credit, which is what
 * actually stops calls from dispatching once it runs out. `auth/api-key.ts`
 * probes the same endpoint for liveness; this check reads the same response
 * for headroom, so a live Connection costs one call per interval, not two.
 *
 * ## No documented ceiling, so this reports headroom, not a percentage
 *
 * Bland's docs describe `current_balance` as "number of credits" and
 * `refill_to` as the auto-refill target when enabled — neither is a fixed
 * plan ceiling the way Apify's `maxMonthlyUsageUsd` is. Rather than invent a
 * limit, this check reports `remaining` alone (no `limit`) and derives state
 * from two signals Bland *does* document:
 *
 *  1. **Account status.** The `status` field on `GET /v1/me` is documented as
 *     `"active"` in the vendor's own example; the vendor's separate error-code
 *     reference documents a `403 Account Flagged` state for a
 *     security-reviewed account. Any status other than `"active"` is reported
 *     `degraded`, since a flagged account cannot dispatch calls even with
 *     credit remaining.
 *  2. **Balance exhaustion.** A balance at or below zero means the account
 *     cannot place a call regardless of status — reported `down`. Below that,
 *     a low-but-positive balance (under 1 credit) is flagged `degraded` as an
 *     early warning; this threshold is this app's own judgment call, not a
 *     vendor-documented ceiling, and is named as such rather than presented as
 *     an official warning line.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

export const ME_URL = `${API_BASE}/v1/me`;

/**
 * Balance at or below zero cannot dispatch a call — `down`, not merely low.
 */
export const EXHAUSTED_THRESHOLD = 0;

/**
 * Below this many credits is flagged early. Arbitrary — Bland documents no
 * per-account warning line — chosen as "roughly enough for a handful of
 * short calls" so a workflow operator sees it before the account actually
 * stops working.
 */
export const LOW_BALANCE_THRESHOLD = 1;

interface MeBody {
  status?: string;
  billing?: { current_balance?: number; refill_to?: number | null };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit balance",
  description: "Remaining pay-as-you-go call credit and account status, read from GET /v1/me.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(ME_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A 403 here means the account is flagged — the auth probe already
      // reports credential liveness, so this stays `unknown` rather than
      // re-deriving a verdict from a status code alone.
      return { state: "unknown", message: `Bland returned ${res.status} for GET /v1/me` };
    }

    const body = await res.json().catch(() => null) as MeBody | null;
    const balance = body?.billing?.current_balance;
    if (typeof balance !== "number") {
      return { state: "unknown", message: "GET /v1/me carried no billing.current_balance" };
    }

    const quotas: HealthQuota[] = [
      {
        id: "credit-balance",
        remaining: Math.max(0, balance),
        unit: "credits",
        ...(typeof body?.billing?.refill_to === "number" ? { limit: body.billing.refill_to } : {}),
      },
    ];

    const notes: string[] = [];
    let state: "ok" | "degraded" | "down" = "ok";

    if (body?.status && body.status !== "active") {
      state = "degraded";
      notes.push(`account status: ${body.status}`);
    }

    if (balance <= EXHAUSTED_THRESHOLD) {
      state = "down";
      notes.push("credit balance exhausted — calls cannot be dispatched");
    } else if (balance < LOW_BALANCE_THRESHOLD) {
      // Unreachable with `state === "down"` here — that's only ever set in the
      // sibling `if` branch above, which this `else if` cannot follow.
      state = "degraded";
      notes.push(`credit balance low (${balance} credits)`);
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
