import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Omnisend publishes no readable rate-limit headroom, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity a declared absence would pin every verdict at `unknown`
 * forever.
 *
 * ## Verified two ways on 2026-09-05
 *
 * 1. **Nothing on the wire.** Two live calls to `GET /brands/current` — one
 *    with no `Authorization` header at all, one with a syntactically
 *    plausible but fake API key — both answered `401` with the response
 *    headers `date`, `content-type`, `content-length`,
 *    `access-control-allow-credentials`, `x-envoy-upstream-service-time`,
 *    `server`, `cf-cache-status`, `set-cookie`, `strict-transport-security`,
 *    `cf-ray` and `alt-svc`. No `X-RateLimit-Limit`, no
 *    `X-RateLimit-Remaining`, no `Retry-After` — nothing rate-limit-shaped on
 *    either response.
 * 2. **Nothing in the documentation.** Omnisend's "Rate limit, timeouts,
 *    errors" reference states the ceilings as fixed per-endpoint numbers
 *    (400 requests/minute by default; 100/min and 15/min on `/segments`;
 *    60/min on `/contacts/tags`; 40/min on the content-render endpoints;
 *    10/min + 55/day on the analytics endpoints) and says the only signal a
 *    caller gets is the `429` itself — which, on a 429, carries an optional
 *    `retryAfter` field IN THE BODY (seconds), not a response header. That is
 *    an after-the-fact refusal reason, not headroom a check can read in
 *    advance.
 *
 * The ceilings are enforced **per brand**, at the API gateway, across every
 * API key and OAuth token acting on that brand's behalf — so even a
 * dedicated-per-connection key shares its budget with every other
 * integration hitting the same brand, and there is no way to read either
 * side of that shared budget ahead of a refusal.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Omnisend exposes no remaining-request count: two live calls to GET /brands/current " +
      "(unauthenticated, and with a fake API key) both answered 401 with no X-RateLimit-Limit, " +
      "no X-RateLimit-Remaining and no Retry-After header, and the rate-limit documentation " +
      "states the only signal is the 429 itself (whose body carries an optional retryAfter in " +
      "seconds, after the fact). The ceilings are fixed per-endpoint and enforced per brand — " +
      "400 requests/minute by default, tighter on /segments (100/min reads, 15/min writes), " +
      "/contacts/tags (60/min), the content-render endpoints (40/min) and the analytics " +
      "endpoints (10/min, 55/day) — and shared across every API key and OAuth token acting on " +
      "that brand, so no single connection's headroom is even well-defined.",
  },
};

export default quota;
