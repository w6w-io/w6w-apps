import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Mercury publishes no readable rate-limit headroom, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity a declared absence would pin this app's verdict at
 * `unknown` forever.
 *
 * ## Verified two ways on 2026-09-05
 *
 * 1. **Nothing on the wire.** Live responses from `api.mercury.com` (a `401`
 *    from `GET /api/v1/accounts` with no bearer, and a `401` from
 *    `GET /api/v1/categories` with a garbage bearer) carried no
 *    `X-RateLimit-*`, `RateLimit-*`, or `Retry-After` header — only
 *    Cloudflare's own tracing headers, `set-cookie`, and standard
 *    caching/security headers.
 * 2. **Nothing in the documentation.** Mercury's own OpenAPI document (see
 *    `lib/client.ts` for how it was obtained) declares no rate-limit header
 *    on any response, and `docs.mercury.com` names no separate rate-limit
 *    guide or quota endpoint.
 *
 * If Mercury begins exposing this, the natural home is a `quota` check
 * reading whatever header or endpoint it lands on — kept separate from
 * `service` (uptime) for the same reason every sibling app in this pack does.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Mercury exposes no rate-limit headroom: live API responses carry no X-RateLimit-*, " +
      "RateLimit-*, or Retry-After header, and its OpenAPI document declares no such header on any " +
      "response. There is no documented ceiling or remaining count to report.",
  },
};

export default quota;
