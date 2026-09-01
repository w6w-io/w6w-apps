/**
 * API request-rate headroom, read from Lokalise's own rate-limit headers.
 *
 * ## This is a real probe, unlike some vendors in this pack
 *
 * Lokalise documents a 6 requests/second ceiling per token and per IP (plus a
 * 10-concurrent-request ceiling per project), and — measured live on
 * 2026-09-01 against `api.lokalise.com` — **every response, including a bare
 * 401, carries `x-ratelimit-limit`, `x-ratelimit-remaining` and
 * `x-ratelimit-reset`**. That is a genuine, currently-usable remaining count,
 * which is exactly the signal several other apps in this pack (Apify among
 * them) had to declare `unavailable` for lack of.
 *
 * ## But the window is one second, so read the number for what it is
 *
 * The observed header shape is `x-ratelimit-limit: 10, 10;w=1, 10;w=1` — an
 * IETF-draft-style list of window descriptions, where `w=1` names a
 * **one-second** window. A health check that runs every `minIntervalSeconds`
 * (60s here) is reading a value that fully resets roughly 60 times between
 * checks, so this reports "were we being throttled at the instant of this
 * check", not a stable trend. That is still worth surfacing — this app shares
 * the token across whatever else is calling Lokalise concurrently, and a
 * connection sitting at zero remaining right now is real, actionable
 * information — but it is not the same claim `health/quota.ts` makes about
 * monthly plan consumption, which is why the two are separate checks.
 *
 * The 10-concurrent-requests-per-project ceiling is not read here: it has no
 * response header of its own, and Lokalise's own description of hitting it is
 * "the next request will be rate limited" — i.e. it presents as the same 429
 * this check already watches for, not as a separate readable number.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, readRateLimit } from "../lib/client.ts";

export const PROBE_URL = `${API_BASE}/projects`;

/** Remaining at or below this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.2;

const requestRate: HealthCheckDefinition = {
  key: "request-rate",
  title: "API request-rate headroom",
  description: "Remaining requests in Lokalise's per-token rate-limit window, read from the " +
    "x-ratelimit-remaining response header on a List Projects call.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${PROBE_URL}?limit=1`, {
      headers: { accept: "application/json" },
    });
    // A 429 IS the signal this check watches for, not a probe failure.
    if (res.status === 429) {
      return { state: "degraded", message: "Lokalise is currently rate-limiting this token" };
    }
    if (!res.ok) {
      return { state: "unknown", message: `Lokalise returned ${res.status} for /projects` };
    }

    const { limit, remaining } = readRateLimit(res);
    if (limit === undefined || remaining === undefined) {
      return { state: "unknown", message: "Response carried no x-ratelimit-* headers" };
    }

    const quota = { id: "request-rate", limit, remaining, unit: "requests/second window" };
    if (limit <= 0) return { state: "ok", quota: [quota] };

    const fraction = remaining / limit;
    if (fraction <= 0) {
      return {
        state: "degraded",
        message: `0/${limit} requests remaining in the current window`,
        quota: [quota],
      };
    }
    if (fraction <= WARN_FRACTION) {
      return {
        state: "degraded",
        message: `${remaining}/${limit} requests remaining in the current window`,
        quota: [quota],
      };
    }
    return { state: "ok", quota: [quota] };
  },
};

export default requestRate;
