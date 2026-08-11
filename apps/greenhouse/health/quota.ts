/**
 * How much of this connection's rate-limit window is left?
 *
 * ## Greenhouse meters requests, not resources
 *
 * There is no monthly allowance, no record quota and no billing meter reachable
 * from Harvest. The only thing metered is request rate, and the vendor's Rate
 * Limiting guide describes it precisely: a **fixed 30-second window**, with
 * separate allowances for custom integrations and partner integrations, and
 * these three headers "in **every** API response":
 *
 *   X-RateLimit-Limit      total requests allowed in the current window
 *   X-RateLimit-Remaining  requests left in it
 *   X-RateLimit-Reset      UTC epoch seconds when the window resets
 *
 * Exceeding it answers 429 with `Retry-After` in seconds. Token requests are
 * metered separately on a 60-second window.
 *
 * The guide gives no numeric ceiling — the limit is per-integration and is only
 * discoverable from the header — which is exactly why reading the header is the
 * whole check rather than a comparison against a documented constant.
 *
 * ## "Every response" is what makes this cheap and robust
 *
 * Because the headers are present on failures too, this check reports headroom
 * even when the call itself is refused. A connection whose scopes do not cover
 * `/v3/user_roles` answers 403 and still tells us how much of the window is
 * left, so a legitimately-narrow credential gets a real quota reading rather than
 * a permanent `unknown`. Only a response with no headers at all is unknown.
 *
 * ## Why `/v3/user_roles`
 *
 * The smallest read in the covered surface: an organisation-level dictionary of
 * role names, with no parent resource and no per-record cost, capped at one row.
 * It is the same endpoint the Auth `test` hooks probe, deliberately — one
 * endpoint, understood once, and `minIntervalSeconds` keeps the pair to one call
 * a minute.
 *
 * ## A 30-second window is short
 *
 * Short enough that "remaining" is a statement about the last few seconds, not
 * about the day. A low reading here means a burst just happened, not that the
 * integration is exhausted — so a depleted window is reported `degraded` and
 * never `down`: it recovers on its own within half a minute, which is not an
 * outage.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_BASE, API_PREFIX, readRateLimit } from "../lib/client.ts";

export const PROBE_URL = `${API_BASE}${API_PREFIX}/user_roles?per_page=1`;

/** Below this fraction of the window remaining, say so. */
export const WARN_FRACTION = 0.2;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description:
    "Requests left in the current 30-second window, read from the X-RateLimit-* headers " +
    "Greenhouse returns on every response.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    const rate = readRateLimit(res.headers);

    if (rate.limit === undefined && rate.remaining === undefined) {
      return {
        state: "unknown",
        message:
          `Greenhouse answered ${res.status} with no X-RateLimit headers, which its own Rate ` +
          "Limiting guide says should be present on every response.",
      };
    }

    const reading: HealthQuota = {
      id: "requests-30s",
      unit: "requests",
      ...(rate.limit !== undefined ? { limit: rate.limit } : {}),
      ...(rate.remaining !== undefined ? { remaining: rate.remaining } : {}),
      ...(rate.resetAt !== undefined
        ? { resetAt: new Date(rate.resetAt * 1000).toISOString() }
        : {}),
    };

    if (res.status === 429) {
      return {
        state: "degraded",
        message: `Rate limited. Retry after ${rate.retryAfter ?? "the Retry-After"} seconds; the ` +
          "window is 30 seconds wide, so this clears on its own.",
        quota: [reading],
        ttlSeconds: 30,
      };
    }

    // A 403 is a scope or Site-Admin problem, not a headroom problem — the quota
    // reading it carries is still valid, so report it rather than discarding it.
    const scopeNote = res.status === 403
      ? "quota read from a 403 response — this connection's scopes or acting user do not cover " +
        "GET /v3/user_roles, which does not affect the reading"
      : undefined;

    const depleted = rate.limit !== undefined && rate.limit > 0 &&
      rate.remaining !== undefined && rate.remaining / rate.limit <= WARN_FRACTION;

    const notes = [
      scopeNote,
      depleted
        ? `${rate.remaining}/${rate.limit} requests left in the current 30-second window`
        : undefined,
      !res.ok && res.status !== 403 ? `probe answered HTTP ${res.status}` : undefined,
    ].filter(Boolean) as string[];

    return {
      // Never `down`: a 30-second window refills itself.
      state: depleted ? "degraded" : "ok",
      message: notes.length > 0 ? notes.join("; ") : undefined,
      quota: [reading],
      ttlSeconds: 30,
    };
  },
};

export default quota;
