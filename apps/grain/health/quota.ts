/**
 * How much rate-limit headroom is left on THIS credential — Grain.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:*` check answers "is the credential live"; this answers "will
 *     the next call succeed or 429".
 *   - `scope: "connection"` and `credential: "signed"` (this kind's defaults)
 *     are both correct: Grain's own docs state the limit is account-wide
 *     ("Grain allows a total of 300 requests per minute"), and reading the
 *     counters needs the credential on the wire.
 *   - No `network.allow` of its own — `api.grain.com` is already on the
 *     app's egress allowlist, which is what makes signing this probe safe.
 *   - `severity: "informational"` — headroom is worth showing and never
 *     worth failing a verdict over; a 429 is a wait, not an outage.
 *
 * Probe: `POST /_/public-api/v2/teams` with an empty body — the same call
 * `auth/api-key.ts`'s `test` hook uses, chosen there for being the cheapest
 * documented endpoint. Reusing it here means this probe costs nothing beyond
 * what a liveness check would anyway.
 *
 * Headers, verbatim from Grain's "Rate Limits" section:
 *
 *   - `x-ratelimit-limit`     — max requests allowed per window (300/min)
 *   - `x-ratelimit-remaining` — requests remaining in the current window
 *   - `Retry-After`           — seconds to wait, **only added if the request
 *     exceeded the limit** (i.e. present only on a 429, not on every response
 *     the way the other two are)
 *
 * Grain publishes no window-reset timestamp, so `resetAt` is left unset on a
 * healthy response — there is nothing to compute it from — and set only on a
 * 429, from `Retry-After`.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_VERSION, GrainClient, readRateLimit } from "../lib/client.ts";

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. It is reported honestly anyway so a UI can
 * show why a workflow is about to start backing off.
 */
const headroom = (remaining?: number, limit?: number): HealthState => {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description: "Requests left in the current account-wide rate-limit window, read from the " +
    "x-ratelimit-* headers on a POST /v2/teams call.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await new GrainClient(ctx).send("/v2/teams", {
      method: "POST",
      headers: { "public-api-version": API_VERSION },
      body: {},
    });
    const reading = readRateLimit(res.headers);

    if (res.status === 429) {
      const retry = reading.retryAfterSeconds;
      return {
        state: "down",
        message: retry === undefined
          ? "rate limited by Grain (HTTP 429)"
          : `rate limited by Grain (HTTP 429); retry after ${retry}s`,
        quota: [{
          id: "account",
          limit: reading.limit,
          remaining: 0,
          unit: "requests",
          resetAt: retry === undefined
            ? undefined
            : new Date(Date.now() + retry * 1000).toISOString(),
        }],
        ttlSeconds: 60,
      };
    }

    if (!res.ok) {
      return { state: "unknown", message: `quota probe returned ${res.status}` };
    }
    if (reading.remaining === undefined) {
      return { state: "unknown", message: "response carried no `x-ratelimit-remaining` header" };
    }

    return {
      state: headroom(reading.remaining, reading.limit),
      quota: [{
        id: "account",
        limit: reading.limit,
        remaining: reading.remaining,
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
