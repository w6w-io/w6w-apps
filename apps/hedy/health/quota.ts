import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE, readRateLimit } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

/**
 * Request-rate headroom, read off `x-ratelimit-*` response headers.
 *
 * ## Why this is a real probe and not a declared absence
 *
 * Hedy's OpenAPI document names no dedicated quota endpoint, but every
 * response this app receives — success or failure, signed or not — carries
 * `x-ratelimit-limit`, `x-ratelimit-remaining` and `x-ratelimit-reset`
 * (measured live 2026-09-05: `limit=200`, decrementing per call, `reset` a
 * Unix timestamp roughly 60 seconds out — a short rolling window, not the
 * "per hour" a bare reading of the header name might suggest). That is a
 * genuine, live-readable signal, unlike Apify's request-rate meter (which
 * publishes a ceiling and nothing else) — see that app's
 * `health/request-rate.ts` for the contrast.
 *
 * ## Same call as the auth probe, on purpose
 *
 * This reads the response from the identical `GET /sessions?limit=1` call
 * `auth/api-key.ts` makes to check liveness. That is deliberate, not
 * duplication: it is the cheapest documented read, and `minIntervalSeconds`
 * keeps the actual request cost to one call per window regardless of how
 * many checks a host runs against it.
 *
 * ## What "exhausted" means here
 *
 * The window recovers on its own every ~60 seconds — this is request
 * throughput, not a monthly plan allowance — so hitting zero is reported as
 * `degraded`, never `down`: the connection is not broken, it is queued.
 */
export const WARN_FRACTION = 0.9;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request-rate headroom",
  description:
    "x-ratelimit-limit / x-ratelimit-remaining / x-ratelimit-reset headers read from GET " +
    "/sessions?limit=1.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 30,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?limit=1`, {
      headers: { accept: "application/json" },
    });
    await res.text().catch(() => undefined); // drain; the headers are what matter here

    const { limit, remaining, resetAt } = readRateLimit(res);
    if (typeof limit !== "number" || typeof remaining !== "number") {
      return { state: "unknown", message: "Hedy's response carried no x-ratelimit-* headers" };
    }

    const reading: HealthQuota = {
      limit,
      remaining,
      unit: "requests",
      ...(typeof resetAt === "number" ? { resetAt: new Date(resetAt * 1000).toISOString() } : {}),
    };

    let state: HealthState = "ok";
    let message: string | undefined;
    if (limit > 0) {
      if (remaining <= 0) {
        state = "degraded";
        message = `rate limit window exhausted (0/${limit} remaining); recovers at reset`;
      } else {
        const fraction = (limit - remaining) / limit;
        if (fraction >= WARN_FRACTION) {
          state = "degraded";
          message = `rate limit at ${
            Math.round(fraction * 100)
          }% (${remaining}/${limit} remaining)`;
        }
      }
    }

    return { state, message, quota: [reading], ttlSeconds: 15 };
  },
};

export default quota;
