import type { HealthCheckDefinition } from "@w6w/types";

/**
 * ElevenLabs publishes no readable *request-rate or concurrency* headroom, so
 * this declares `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 *
 * ## Why this is separate from `health/quota.ts`
 *
 * ElevenLabs meters two independent things and only one is readable in advance.
 * Plan consumption *is* readable and is probed by the `quota` check. Request
 * rate and concurrency are not, and collapsing the two would let a healthy
 * character-allowance reading imply something about rate headroom that
 * ElevenLabs never told us — which matters here more than for most vendors,
 * because the concurrency ceiling is per plan tier and is the limit a
 * fan-out workflow hits first, long before it runs out of characters.
 *
 * ## Verified two ways on 2026-08-11
 *
 * 1. **Nothing on the wire.** Live responses from `api.elevenlabs.io` carried
 *    `date`, `server`, `content-length`, `content-type`, `vary`,
 *    `access-control-allow-origin`, `access-control-allow-headers`,
 *    `access-control-allow-methods`, `access-control-max-age`,
 *    `strict-transport-security`, `x-trace-id`, `x-region`, `via` and
 *    `alt-svc`. There is **no** `X-RateLimit-Limit`, **no**
 *    `X-RateLimit-Remaining` and **no** reset header on any of them — not on a
 *    `200` (`GET /v1/voices`) and not on a `401` (`GET /v1/user/subscription`).
 * 2. **Nothing in the documentation.** The vendor's errors page states that a
 *    `429` means "you have either made too many requests in a short period of
 *    time and exceeded the rate limit for the API endpoint, or you have exceeded
 *    the concurrency limit", distinguished by the error `code`
 *    (`rate_limit_exceeded` vs `concurrent_limit_exceeded`), and prescribes
 *    exponential backoff. It publishes no endpoint that reports either ceiling
 *    or the count against it.
 *
 * The `GET /v1/usage/character-stats` endpoint can be asked for a `concurrency`
 * metric, but that is a historical time series of observed concurrency, not the
 * plan's ceiling or the headroom against it — reporting it as quota would be
 * inventing a limit the vendor never published.
 */
const requestRate: HealthCheckDefinition = {
  key: "request-rate",
  title: "API request-rate and concurrency headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "ElevenLabs exposes no remaining request count and no concurrency headroom: a live API " +
      "response carries no X-RateLimit-* header of any kind (measured on both a 200 and a 401), " +
      "and the vendor's errors documentation states the only signal is the 429 itself, whose " +
      "`code` distinguishes rate_limit_exceeded from concurrent_limit_exceeded. The documented " +
      "remedy is client-side exponential backoff for the first and waiting for in-flight " +
      "requests for the second. Plan consumption, which IS readable, is reported by the `quota` " +
      "check instead.",
  },
};

export default requestRate;
