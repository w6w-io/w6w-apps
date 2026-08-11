import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Baserow publishes no request headroom to read, so this declares `unavailable`
 * with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 *
 * ## Verified three ways on 2026-08-10
 *
 * 1. **Nothing on the wire.** A live response from
 *    `api.baserow.io/api/database/tables/all-tables/` carried `server`,
 *    `x-frame-options`, `x-content-type-options` and
 *    `x-envoy-upstream-service-time` — no `RateLimit-*`, no `X-RateLimit-*` and
 *    no `Retry-After`.
 * 2. **Almost nothing in the specification.** Baserow's OpenAPI document
 *    (v2.3.3, 293 paths, 6.0 MB) contains **zero** occurrences of `RateLimit`,
 *    `X-RateLimit`, `Retry-After` or `throttl`, and declares a `429` response on
 *    exactly **two** endpoints — `POST /api/two-factor-auth/verify/` and
 *    `POST /api/workspaces/invitations/workspace/{id}/`. Neither is in this
 *    app's surface, and both are anti-abuse limits on a security-sensitive
 *    action rather than an API allowance. No row endpoint declares a 429 at all.
 * 3. **Nothing that would generalise.** Baserow is self-hostable, and a
 *    self-hosted instance is bounded by whatever its own reverse proxy enforces
 *    — which this app has no way to read.
 *
 * ## The limits that DO exist, and why none of them is this check
 *
 * Baserow constrains the *size of a request*, not a rate: every batch endpoint
 * caps `items` at **200** (`maxItems` in the spec, enforced in
 * `lib/client.ts`'s `assertBatchSize`), and the hosted plans meter rows and
 * storage per workspace. A row ceiling is a capacity fact, not an allowance that
 * depletes with requests, and reporting one as if it were rate-limit headroom
 * would be worse than saying plainly that there is none to read.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Baserow publishes no request-rate headroom: a live API response carries no RateLimit-*, " +
      "X-RateLimit-* or Retry-After header, and its OpenAPI document (v2.3.3, 293 paths) declares " +
      "a 429 on only two endpoints — two-factor verification and workspace invitations, both " +
      "anti-abuse limits outside this app's surface. What it does limit is request size (200 " +
      "items per batch) and, on the hosted plans, rows and storage per workspace — neither an " +
      "allowance that can be read before it runs out. A self-hosted instance is bounded by its " +
      "own reverse proxy, which this app cannot see.",
  },
};

export default quota;
