/**
 * ~~`quota`~~ — a declared absence, at `informational` severity.
 *
 * Streak publishes no rate limit or quota surface anywhere this app could
 * find: no dedicated rate-limiting doc page (`/docs/rate-limiting` 404s), no
 * mention of a request ceiling, throttling window or `429` in the
 * authentication, overview or getting-started guides, and no
 * `X-RateLimit-*` (or equivalent) response header appears in any of the
 * reference examples for the 39 operations this app implements. Checked
 * 2026-08-25.
 *
 * `severity: "informational"` is load-bearing, not decorative: an
 * `unavailable` entry always reports `unknown`, `unknown` outranks `ok` in
 * the roll-up, and at any other severity this would pin the App's overall
 * verdict at `unknown` forever. See `HEALTHCHECKS.md`.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate limit headroom",
  description: "Streak publishes no rate-limit or quota surface to probe.",
  kind: "quota",
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason:
      "Streak's API reference names no rate limit, quota, or 429 response anywhere in its docs, " +
      "and no example response carries a rate-limit header.",
  },
};

export default quota;
