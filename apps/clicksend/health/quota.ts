/**
 * How much of ClickSend's per-account request rate limit is left?
 *
 * Undocumented in the API Blueprint (there is no "Rate Limiting" section despite
 * the Status Codes table linking to one), but real and present on every response
 * — verified live on 2026-08-24 against `rest.clicksend.com`:
 *
 * ```
 * x-ratelimit-limit: 6000
 * x-ratelimit-remaining: 5999
 * ratelimit-reset: 56
 * ```
 *
 * `ratelimit-reset` is a **delay in seconds until the window resets**, not a
 * Unix timestamp — the observed values (49, 56) are far too small to be epoch
 * time and shrink between successive calls inside the same window. This check
 * converts it to an absolute `resetAt` itself so `HealthQuota.resetAt` still
 * gets an ISO timestamp as the type requires.
 *
 * This reads the same `GET /account/usage/{year}/{month}/subaccount` call the
 * Auth `test` hook already makes (see `auth/basic-auth.ts`) rather than a
 * dedicated endpoint — ClickSend has none, and the rate-limit headers ride on
 * every authenticated response regardless of which one it is.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";
import { usagePath } from "../auth/basic-auth.ts";

/** Remaining fraction at or below this is worth flagging before it hits zero. */
export const WARN_REMAINING_FRACTION = 0.1;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate limit headroom",
  description:
    "Per-account request rate limit, read from the x-ratelimit-* response headers on the " +
    "account usage call (undocumented but present on every ClickSend response).",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${usagePath()}`, {
      headers: { accept: "application/json" },
    });

    const limitHeader = res.headers.get("x-ratelimit-limit");
    const remainingHeader = res.headers.get("x-ratelimit-remaining");
    const resetHeader = res.headers.get("ratelimit-reset");

    if (limitHeader === null || remainingHeader === null) {
      // Not a failure of the probe itself — `test` already covers credential
      // liveness. Absence of the headers means there is nothing to report.
      return {
        state: "unknown",
        message: "ClickSend response carried no x-ratelimit-* headers",
      };
    }

    const limit = Number(limitHeader);
    const remaining = Number(remainingHeader);
    if (!Number.isFinite(limit) || !Number.isFinite(remaining) || limit <= 0) {
      return { state: "unknown", message: "ClickSend rate-limit headers were not numeric" };
    }

    const resetSeconds = Number(resetHeader);
    const resetAt = Number.isFinite(resetSeconds)
      ? new Date(Date.now() + resetSeconds * 1000).toISOString()
      : undefined;

    const quotaReading: HealthQuota = {
      id: "requests",
      limit,
      remaining,
      unit: "requests",
      ...(resetAt ? { resetAt } : {}),
    };

    const fraction = remaining / limit;
    const state = fraction <= 0 ? "down" : fraction <= WARN_REMAINING_FRACTION ? "degraded" : "ok";

    return {
      state,
      message: state !== "ok"
        ? `${remaining}/${limit} requests remaining in the current window`
        : undefined,
      quota: [quotaReading],
      ttlSeconds: 60,
    };
  },
};

export default quota;
