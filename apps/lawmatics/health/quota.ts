/**
 * Quota headroom — declared unavailable.
 *
 * Lawmatics documents a firm-wide 50 requests/minute rate limit and states
 * that exceeding it answers `429` with a `Retry-After: 60` header — but that
 * is the only quota signal the vendor publishes anywhere in the collection.
 * No response (checked against every saved example, success and error alike)
 * carries an `X-RateLimit-*`/`RateLimit-*` header or any other proactive
 * headroom reading, so there is nothing to read in advance of hitting the
 * limit — only the 429 itself, after the fact.
 *
 * `severity: "informational"` is required here, not optional: an
 * `unavailable` check otherwise pins the App's health at `unknown` forever
 * (`unknown` outranks `ok` in the roll-up).
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request-rate headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason:
      "Lawmatics documents a 50 req/min per-firm rate limit (429 + Retry-After: 60 when exceeded) " +
      "but publishes no rate-limit header or other endpoint that reads remaining headroom in advance.",
  },
};

export default quota;
