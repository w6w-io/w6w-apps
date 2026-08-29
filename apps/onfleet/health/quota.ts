/**
 * How much of the shared 20-req/s budget is left — Onfleet.
 *
 * Confirmed against `docs.onfleet.com/reference/throttling`: the limit is
 * **20 requests per second across ALL of an organization's API keys
 * combined** — not per key — and Onfleet publishes `X-RateLimit-Limit` and
 * `X-RateLimit-Remaining` response headers "to help you understand how many
 * requests are available for a given rolling window period and how many are
 * instantaneously remaining."
 *
 * There is no dedicated usage endpoint, so this reads those headers off the
 * cheapest authenticated call available — the same `GET /auth/test` the
 * derived `auth:api-key` check already uses — rather than spending a request
 * on a call that does nothing else.
 *
 * Because the budget is shared across every key on the organization, a low
 * reading here can be caused by a DIFFERENT connection's traffic, not this
 * one's — `severity: "informational"` reflects that this is headroom to
 * watch, not a verdict on this credential.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_PATH, BASE_URL, RATE_LIMIT_PER_SECOND } from "../lib/client.ts";

function headroom(remaining?: number, limit?: number): HealthState {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request-rate headroom",
  description:
    "Onfleet's 20 req/s budget is shared across every API key on the organization, read from " +
    "the `X-RateLimit-*` headers on the cheapest available call.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 30,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${BASE_URL}${API_PATH}/auth/test`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "unknown", message: `could not reach Onfleet: ${String(err)}` };
    }
    await res.body?.cancel();

    if (!res.ok) return { state: "unknown", message: `Onfleet returned ${res.status}` };

    const limitHeader = res.headers.get("x-ratelimit-limit");
    const remainingHeader = res.headers.get("x-ratelimit-remaining");
    if (limitHeader === null && remainingHeader === null) {
      return {
        state: "unknown",
        message: "Onfleet did not return X-RateLimit-* headers on this response",
      };
    }

    const limit = limitHeader ? Number(limitHeader) : undefined;
    const remaining = remainingHeader ? Number(remainingHeader) : undefined;
    const state = headroom(remaining, limit);

    return {
      state,
      message: remaining !== undefined
        ? `${remaining}${limit !== undefined ? `/${limit}` : ""} requests remaining in the ` +
          `rolling window (shared budget is ${RATE_LIMIT_PER_SECOND}/s across the organization)`
        : "Onfleet did not report a remaining count",
      quota: [{ limit, remaining, unit: "requests" }],
      ttlSeconds: 15,
    };
  },
};

export default quota;
