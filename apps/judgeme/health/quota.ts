import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Judge.me publishes no readable rate-limit signal of any kind, so this
 * declares `unavailable` with a reason rather than pretending to probe.
 *
 * Verified two ways on 2026-09-05:
 *
 * 1. **Nothing in the document.** No path, response header, or prose in the
 *    67,965-byte OpenAPI document mentions a rate limit, quota, or
 *    `X-RateLimit-*`/`Retry-After` header anywhere.
 * 2. **Nothing on the wire.** A live 401 response from `api.judge.me`
 *    (`GET /api/v1/settings?shop_domain=...`) carried only `date`,
 *    `content-type`, `content-length`, the `x-frame-options`/CSP-adjacent
 *    security headers, `x-request-id`, `x-runtime` and
 *    `strict-transport-security` — no rate-limit header of any kind.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity this would pin the app's quota verdict at `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Judge.me's OpenAPI document names no rate-limit or quota mechanism anywhere, and a live " +
      "401 response from api.judge.me carries no X-RateLimit-*/Retry-After header of any kind " +
      "(checked 2026-09-05). There is nothing to read.",
  },
};

export default quota;
