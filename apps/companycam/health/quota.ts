/**
 * How much CompanyCam API quota is left? Nothing published says.
 *
 * This is a declared absence, not a gap. Three places were checked on
 * 2026-08-11 and none of them answers the question:
 *
 *  1. **The OpenAPI document** (`github.com/CompanyCam/openapi-spec`, 187,449 B)
 *     declares response headers on exactly two operations — `listPhotos` and
 *     `listProjectPhotos` — and all four are pagination cursors
 *     (`X-Next-Cursor`, `X-Prev-Cursor`, `X-Has-Next`, `X-Has-Prev`). No
 *     `X-RateLimit-*`, no `RateLimit-*`, no `Retry-After`.
 *  2. **The wire.** Live responses from `api.companycam.com` carried no
 *     rate-limit header of any spelling. The full header set on a `401` from
 *     `GET /v2/projects` was `content-type`, `content-length`, `date`,
 *     `x-rack-cors`, `server`, `x-frame-options`, `x-xss-protection`,
 *     `x-content-type-options`, `x-permitted-cross-domain-policies`,
 *     `referrer-policy`, `cache-control`, `x-request-id`, `x-runtime`,
 *     `strict-transport-security`, `vary`, `x-cache`, `via`, `x-amz-cf-pop`,
 *     `alt-svc`, `x-amz-cf-id`, `x-robots-tag`.
 *  3. **The documentation.** Neither the guides nor the reference mention a
 *     rate limit, a quota, a burst allowance or a 429 response; `429` does not
 *     appear as a documented status on any of the 62 operations.
 *
 * There is also no account-metering endpoint to read instead: CompanyCam meters
 * seats and plan tier (API access requires Pro, Premium or Elite), and neither
 * is exposed by the API — `GET /v2/company` returns id, name, status, address
 * and logo, with no plan or usage field.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity this honest statement would pin the app's verdict at `unknown`
 * forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  description:
    "CompanyCam publishes no rate-limit or quota signal: no rate-limit response headers on the " +
    "wire, none declared in the OpenAPI document, no documented limit or 429, and no " +
    "usage-reporting endpoint.",
  kind: "quota",
  scope: "connection",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "CompanyCam documents no rate limit and returns no rate-limit headers (checked against " +
      "the vendor OpenAPI document and live responses on 2026-08-11), and exposes no endpoint " +
      "reporting plan usage. Headroom cannot be measured, only guessed at, so it is not " +
      "reported.",
  },
};

export default quota;
