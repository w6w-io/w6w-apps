/**
 * Declared absence: HeyGen publishes no rate-limit headroom to read.
 *
 * Measured live 2026-08-24 against `GET /v3/users/me`, both unauthenticated and with a fake key:
 * the only response headers on either a 200 or a 401 are `date`, `content-type`,
 * `content-length` and `server`. No `X-RateLimit-Limit`, no remaining count, no window size. The
 * vendor's own Usage Limits doc confirms the shape: a 429 carries `Retry-After` (seconds to wait)
 * and nothing else — a retry delay, not a headroom reading. There is nothing here for a `check`
 * hook to report ahead of time; the first evidence of hitting the limit IS the 429 itself.
 *
 * The 10-concurrent-video-job ceiling documented for Pay-As-You-Go plans is a similar dead end:
 * it is not exposed on any read endpoint either, only inferable after a submission is refused.
 *
 * `severity: "informational"` is required, not decorative — `unavailable` always reports
 * `unknown`, which outranks `ok` in the roll-up, so any other severity would pin this app's
 * overall verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const requestRate: HealthCheckDefinition = {
  key: "request-rate",
  title: "Request-rate headroom",
  kind: "quota",
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason:
      "HeyGen sends no X-RateLimit-* (or equivalent) header on any response, success or 429 — " +
      "only a Retry-After delay once the limit is already hit. The 10-concurrent-job ceiling for " +
      "Pay-As-You-Go plans is likewise unreadable ahead of a refused submission.",
  },
};

export default requestRate;
