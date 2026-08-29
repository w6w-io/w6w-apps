import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Pinterest publishes no readable *rate-limit headroom*, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity a declared absence would pin every verdict at `unknown`
 * forever.
 *
 * ## Verified two ways on 2026-08-29
 *
 * 1. **Nothing on the wire.** `GET /v5/user_account`, unauthenticated and with
 *    a bogus bearer token (both `401`), carried `content-type`,
 *    `x-content-type-options`, `cache-control`, `age`, `set-cookie`,
 *    `x-pinterest-rid`, `date`, `x-cdn`, `alt-svc`, `pinterest-generated-by`
 *    and `content-length` — no `X-RateLimit-*`, `RateLimit-*`, or any other
 *    remaining-quota header of any kind.
 * 2. **Nothing in the OpenAPI description.** Pinterest's own machine-readable
 *    API description (`github.com/pinterest/api-description`, `v5/openapi.json`)
 *    declares no rate-limit response header on any operation and no quota
 *    schema.
 *
 * Pinterest's developer documentation states call-volume ceilings differ by
 * endpoint and by app tier, but the only signal an integration gets in
 * practice is a `429` itself, which arrives after the request was already
 * refused — not something a health check can read in advance.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Pinterest exposes no remaining-request count: live API responses (both unauthenticated " +
      "and with an invalid token) carry no X-RateLimit-* or RateLimit-* header of any kind, and " +
      "the OpenAPI description declares none. Pinterest's own developer documentation states " +
      "that call-volume ceilings vary by endpoint and app tier, and that the only signal is the " +
      "429 refusal itself.",
  },
};

export default quota;
