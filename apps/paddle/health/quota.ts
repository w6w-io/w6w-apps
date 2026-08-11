import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Paddle publishes no readable request headroom, so this declares `unavailable`
 * with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 *
 * ## Verified two ways on 2026-08-10
 *
 * 1. **Nothing on the wire.** A live response from `api.paddle.com` carried
 *    `date`, `content-type`, `content-length`, `set-cookie`, `cache-control`,
 *    `content-security-policy`, `cross-origin-*`, `permissions-policy`,
 *    `pragma`, `referrer-policy`, `request-id`, `strict-transport-security`,
 *    `x-content-type-options`, `x-frame-options`,
 *    `x-permitted-cross-domain-policies`, `x-robots-tag`, `cf-cache-status`,
 *    `server` and `cf-ray` — and no `RateLimit-*`, no `X-RateLimit-*` and no
 *    remaining-quota header of any kind.
 * 2. **Nothing in the documentation.** Paddle's rate-limiting page documents
 *    the limits as fixed numbers and says the only signal is the `429` itself,
 *    whose `Retry-After` header tells you how long to wait *after* you have
 *    already been refused.
 *
 * ## The limits that DO exist, and why none of them is readable in advance
 *
 *  - **240 requests per minute per IP** across the whole API. Exceeding it
 *    returns `too_many_requests` (429) and blocks that IP for 60 seconds.
 *  - **1,000 requests per minute per IP** for the two preview endpoints
 *    (preview transaction, preview prices), which exist to back pricing pages.
 *  - **20 chargeable subscription updates per hour, 100 per 24 hours, per
 *    account** — a separate allowance with its own error codes
 *    (`subscription_immediate_charge_hour_limit_exceeded` and its 24-hour
 *    sibling).
 *
 * All three are enforced by refusal. None is exposed as a remaining count, and
 * the first two are *per IP* — which for a hosted runtime is shared with every
 * other tenant on the same egress address, so even a correct reading would not
 * describe this Connection's headroom.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Paddle publishes no readable request headroom: a live API response carries no RateLimit-*, " +
      "X-RateLimit-* or remaining-count header, and the vendor's rate-limiting page documents " +
      "only fixed ceilings enforced by refusal — 240 requests/minute per IP (1,000/minute for " +
      "the preview endpoints), plus 20 chargeable subscription updates per hour and 100 per day " +
      "per account. The per-IP limits are also shared across every tenant on the same egress " +
      "address, so even a reading would not describe this connection's share.",
  },
};

export default quota;
