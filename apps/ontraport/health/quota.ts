/**
 * How much of this account's per-minute rate limit is left?
 *
 * Unlike several sibling apps in this pack, this is a genuine live reading
 * rather than a declared absence: Ontraport's "Rate limiting" section
 * documents three response headers present on **every** request —
 * `X-Rate-Limit-Limit`, `X-Rate-Limit-Remaining`, `X-Rate-Limit-Reset`
 * (seconds until the rolling window resets) — and this was confirmed live on
 * 2026-09-05 (`x-rate-limit-limit: 180`, `x-rate-limit-remaining: 179`,
 * `x-rate-limit-reset: 23`, measured on an *unauthenticated* call, so the
 * headers are attached before credential validation even runs).
 *
 * The doc's own number: **180 requests per minute per account**, a rolling
 * limit. This check reads it off the same signed call the Auth `test` hook
 * already makes ({@link CREDENTIAL_PROBE_PATH}), so headroom reporting costs
 * nothing beyond the credential-liveness probe the host runs anyway.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, CREDENTIAL_PROBE_PATH } from "../lib/client.ts";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description: "Requests remaining in the current rolling one-minute window, read from the " +
    "X-Rate-Limit-* response headers Ontraport attaches to every request.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 30,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${CREDENTIAL_PROBE_PATH}`, {
      headers: { accept: "application/json" },
    });

    const limitHeader = res.headers.get("x-rate-limit-limit");
    const remainingHeader = res.headers.get("x-rate-limit-remaining");
    const resetHeader = res.headers.get("x-rate-limit-reset");

    if (limitHeader === null || remainingHeader === null) {
      // Not documented to ever be absent, but a header a vendor drops
      // silently must not be reported as "0 requests left".
      return { state: "unknown", message: "Ontraport did not return rate-limit headers" };
    }

    const limit = Number(limitHeader);
    const remaining = Number(remainingHeader);
    if (!Number.isFinite(limit) || !Number.isFinite(remaining)) {
      return { state: "unknown", message: "Ontraport's rate-limit headers were not numeric" };
    }

    const resetAt = resetHeader && Number.isFinite(Number(resetHeader))
      ? new Date(Date.now() + Number(resetHeader) * 1000).toISOString()
      : undefined;

    const fraction = limit > 0 ? (limit - remaining) / limit : 0;
    const state = fraction >= 1 ? "degraded" : fraction >= 0.9 ? "degraded" : "ok";

    return {
      state,
      message: state !== "ok"
        ? `${remaining}/${limit} requests left in the current window`
        : undefined,
      quota: [{ id: "requests-per-minute", limit, remaining, unit: "requests", resetAt }],
      ttlSeconds: 30,
    };
  },
};

export default quota;
