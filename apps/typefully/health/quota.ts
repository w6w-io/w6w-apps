import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * How much of this connection's per-user request budget is left?
 *
 * Typefully carries `X-RateLimit-User-Limit` / `-Remaining` / `-Reset` on
 * **every** API response — verified live on 2026-08-29 against `GET /v2/me`.
 * There is no dedicated "quota" endpoint to call; the numbers ride along with
 * whatever the check calls anyway, so this reuses the same cheap, credential-
 * liveness-proving `GET /v2/me` the Auth `test` hook probes
 * (`auth/api-key.ts`) rather than spending a second request on a purpose-built
 * ping.
 *
 * ## Why only the user-level budget, not the social-set one
 *
 * Typefully also rate-limits specific operations **per social set** (its own
 * example is `"drafts.create"`), reported via `X-RateLimit-SocialSet-*`
 * headers — but those only appear on a response from the operation they
 * gate. Reading them here would mean actually calling `POST /drafts` (or
 * whichever operation) from a health check, which creates a real draft as a
 * side effect a health probe must never have. So this check reports the
 * user-level budget, which is unconditionally observable, and leaves the
 * per-operation social-set budget unprobed rather than fabricating a side
 * effect to read it.
 *
 * ## Reading "remaining"
 *
 * `0` remaining means the very next call gets `429 RATE_LIMITED` — that is
 * `down`, not merely `degraded`, because it is imminent. Below ~10% of the
 * limit is flagged `degraded` as an early warning. `resetAt` is reported
 * verbatim from the vendor's Unix-timestamp header, converted to ISO 8601.
 */

/** Consumption at or below this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.1;

export interface UserRateLimit {
  limit?: number;
  remaining?: number;
  /** ISO 8601, converted from the vendor's Unix-timestamp header. */
  resetAt?: string;
}

/** Read the three `X-RateLimit-User-*` headers off any Typefully response. */
export function readUserRateLimit(headers: Headers): UserRateLimit {
  const limitRaw = headers.get("x-ratelimit-user-limit");
  const remainingRaw = headers.get("x-ratelimit-user-remaining");
  const resetRaw = headers.get("x-ratelimit-user-reset");

  const limit = limitRaw !== null && limitRaw !== "" ? Number(limitRaw) : undefined;
  const remaining = remainingRaw !== null && remainingRaw !== "" ? Number(remainingRaw) : undefined;
  const resetEpoch = resetRaw !== null && resetRaw !== "" ? Number(resetRaw) : undefined;
  const resetAt = resetEpoch !== undefined && Number.isFinite(resetEpoch)
    ? new Date(resetEpoch * 1000).toISOString()
    : undefined;

  return {
    limit: Number.isFinite(limit) ? limit : undefined,
    remaining: Number.isFinite(remaining) ? remaining : undefined,
    resetAt,
  };
}

/** Turn a reading into the state it implies. Exported so the arithmetic is testable without a fetch. */
export function stateFor(reading: UserRateLimit): { state: HealthState; message?: string } {
  const { limit, remaining } = reading;
  if (limit === undefined || remaining === undefined) {
    return { state: "unknown", message: "Response carried no X-RateLimit-User-* headers" };
  }
  if (remaining <= 0) {
    return {
      state: "down",
      message: `User rate limit exhausted (0/${limit} remaining)` +
        (reading.resetAt ? `; resets ${reading.resetAt}` : ""),
    };
  }
  const fraction = limit > 0 ? remaining / limit : 1;
  if (fraction <= WARN_FRACTION) {
    return {
      state: "degraded",
      message: `User rate limit low (${remaining}/${limit} remaining)` +
        (reading.resetAt ? `; resets ${reading.resetAt}` : ""),
    };
  }
  return { state: "ok" };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Per-user request-rate headroom",
  description:
    "Reads X-RateLimit-User-Limit/-Remaining/-Reset off a GET /v2/me response. Does not cover " +
    "the separate per-social-set operation limits (e.g. drafts.create), which only appear on " +
    "the response of the operation they gate and cannot be read without triggering a real " +
    "side effect.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/me`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      // A rejected credential says nothing about rate-limit headroom — that's
      // the derived `auth:api-key` check's job.
      return { state: "unknown", message: `Typefully returned ${res.status} for /v2/me` };
    }

    const reading = readUserRateLimit(res.headers);
    const { state, message } = stateFor(reading);
    const quotaEntry = reading.limit !== undefined && reading.remaining !== undefined
      ? [{
        id: "user",
        limit: reading.limit,
        remaining: reading.remaining,
        unit: "requests",
        ...(reading.resetAt ? { resetAt: reading.resetAt } : {}),
      }]
      : undefined;

    return { state, message, quota: quotaEntry, ttlSeconds: 60 };
  },
};

export default quota;
