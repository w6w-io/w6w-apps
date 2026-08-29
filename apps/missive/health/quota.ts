import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declared `unavailable` rather than guessed.
 *
 * Missive's own rate-limits documentation (`missiveapp.com/docs/developers/rest-api/rate-limits`,
 * verified 2026-08-29) states the ceilings as fixed numbers — 5 concurrent
 * requests, 300/minute, 900/15 minutes — and describes `Retry-After`,
 * `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` only
 * as headers that accompany the `429 Too Many Requests` refusal itself:
 * "When a rate limit is reached, Missive API will return the following HTTP
 * error status code: 429 … with the following headers." Nothing in the
 * documentation describes those headers as present on an ordinary successful
 * response, and this app has no unauthenticated Missive endpoint to probe
 * ahead of time to confirm otherwise (every endpoint requires a token,
 * verified live: `GET /v1/organizations` with no `Authorization` header
 * answers 401).
 *
 * `severity: "informational"` so an absent check never worsens a roll-up
 * verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description: "Missive documents its rate-limit headers (Retry-After, X-RateLimit-Limit, " +
    "X-RateLimit-Remaining, X-RateLimit-Reset) as accompanying only the 429 refusal itself, " +
    "never an ordinary response — there is nothing to read ahead of a rejection.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Missive's rate-limit headers (Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, " +
      "X-RateLimit-Reset) are documented as accompanying only the 429 Too Many Requests " +
      "response, never a normal one — there is no proactive headroom signal to probe. The " +
      "ceilings are fixed and published instead: 5 concurrent requests, 300/minute, " +
      "900/15 minutes.",
  },
};

export default quota;
