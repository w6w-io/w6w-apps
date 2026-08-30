import type { HealthCheckDefinition } from "@w6w/types";

/**
 * VideoAsk publishes no readable rate-limit headroom, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity a declared absence would pin every verdict at `unknown`
 * forever.
 *
 * ## Verified two ways on 2026-08-30
 *
 * 1. **Nothing on the wire.** A live, unauthenticated `GET /forms` (which
 *    still exercises the same edge as an authenticated call — VideoAsk answers
 *    `401` before any rate-limit accounting would differ) carried `date`,
 *    `content-type`, `content-length`, `set-cookie`, `server: istio-envoy`,
 *    `www-authenticate`, `allow`, `content-security-policy`,
 *    `access-control-allow-private-network`, `x-frame-options`, `vary`,
 *    `strict-transport-security`, `x-content-type-options`, `referrer-policy`,
 *    `cross-origin-opener-policy` and `x-envoy-upstream-service-time` — no
 *    `x-ratelimit-*`, `retry-after`, or similar header.
 * 2. **Nothing in the vendor's own Postman collection.** The 45+ requests it
 *    documents show no rate-limit header anywhere in a captured response, and
 *    no prose section describes one.
 */
const requestRate: HealthCheckDefinition = {
  key: "request-rate",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "VideoAsk exposes no rate-limit headers on any response — a live unauthenticated probe " +
      "against GET /forms on 2026-08-30 carried no x-ratelimit-*, retry-after or similar header, " +
      "and the vendor's own Postman collection documents none across its 45+ requests. There is " +
      "no other endpoint that reports request-rate headroom.",
  },
};

export default requestRate;
