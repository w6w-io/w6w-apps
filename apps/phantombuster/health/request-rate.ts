import type { HealthCheckDefinition } from "@w6w/types";

/**
 * PhantomBuster publishes no request-rate policy of any kind, so this
 * declares `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity a declared absence would pin every verdict at `unknown`
 * forever.
 *
 * ## Verified two ways on 2026-09-01
 *
 * 1. **Nothing on the wire.** A live 401 response from `api.phantombuster.com`
 *    (`GET /orgs/fetch-resources` with a fake key) carried `date`,
 *    `content-type`, `content-length`, `vary`, `access-control-allow-origin`,
 *    `cache-control` and a vendor-specific `x-phantombuster-cid` — and no
 *    `X-RateLimit-*` header of any kind, no `Retry-After`.
 * 2. **Nothing in the documentation.** Neither the "API" guide, the full
 *    OpenAPI 3.0 document, nor any other fetched reference page mentions a
 *    rate limit, a `429` status, or a request budget anywhere. This is a
 *    stronger absence than Apify's in this same pack — Apify at least
 *    documents its ceilings in prose even though it exposes no remaining
 *    count; PhantomBuster documents no policy at all.
 *
 * Account-level plan consumption, which IS readable, is reported by the
 * `quota` check instead.
 */
const requestRate: HealthCheckDefinition = {
  key: "request-rate",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "PhantomBuster documents no rate-limiting policy anywhere in its API reference or guides, " +
      "and a live 401 response carries no X-RateLimit-* header of any kind and no Retry-After. " +
      "There is nothing to read a remaining count from, and no documented ceiling to state either. " +
      "Plan consumption, which IS readable, is reported by the `quota` check instead.",
  },
};

export default requestRate;
