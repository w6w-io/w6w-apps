import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Brex publishes rate limits but no readable headroom, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin this App's verdict at `unknown` forever.
 *
 * ## The limits are real; the counters are not
 *
 * `https://developer.brex.com/guides/rate_limits.md`, verbatim: per Client ID
 * and Brex account, "Up to 1,000 requests in 60 seconds", "Up to 1,000 transfers
 * in 24 hours", "Up to 100 international wires in 24 hours", "Up to 5,000 cards
 * created in 24 hours". Exceeding one answers `429`, and Brex's documented
 * remedy is a client-side retry mechanism with exponential backoff — which is a
 * client behaviour, not something a check can read.
 *
 * ## Verified on the wire, 2026-09-22
 *
 * Two live calls to `api.brex.com` were read header by header:
 *
 *   | Request                                   | Headers of interest                                                                   |
 *   | ----------------------------------------- | ------------------------------------------------------------------------------------- |
 *   | `GET /v2/users/me`, no credential          | `date`, `x-brex-trace-id`, `x-brex-parent-id`, `x-brex-sampling-priority`, `x-envoy-upstream-service-time`, `strict-transport-security`, `pragma`, `x-content-type-options`, `x-permitted-cross-domain-policies` — and **no** `X-RateLimit-*`, `RateLimit-*` or `Retry-After` |
 *   | `GET /v2/users/me`, invalid token (`403`)  | the same set plus `content-type: application/json` and `content-length` — again **no** rate-limit header |
 *
 * Both responses are listed in full so the absence is checkable rather than
 * asserted. There is no endpoint that reports remaining quota either: the
 * Team API's surface is users, locations, departments, titles, cards, legal
 * entities and company, and none of them carries a counter.
 *
 * ## Why this is not folded into the credential probe
 *
 * `auth/api-token.ts` answers "is this token live?". A quota reading answers a
 * different question with a different fix — a live token on an account that has
 * hit its 1,000-per-minute ceiling needs backoff, not a new token. Collapsing
 * them would let a green credential reading imply headroom Brex never reported.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Brex exposes no remaining-quota count anywhere. Its rate-limit guide documents the " +
      "ceilings in prose only — 1,000 requests per 60 seconds, 1,000 transfers per 24 hours, 100 " +
      "international wires per 24 hours, 5,000 cards created per 24 hours, per Client ID and " +
      "Brex account — and states that exceeding one is signalled only by the 429 itself, with " +
      "client-side exponential backoff as the remedy. Two live responses from api.brex.com " +
      "(read 2026-09-22, listed in full above) carried no X-RateLimit-*, RateLimit-* or " +
      "Retry-After header of any kind, and no Team API endpoint reports a counter.",
  },
};

export default quota;
