import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Keap enforces a per-second spike policy and publishes no reading for it, so
 * this declares `unavailable` with the vendor's own reason rather than
 * pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity a declared absence would pin the whole App at `unknown`
 * forever.
 *
 * ## Why this is separate from `health/quota.ts`
 *
 * Keap meters four windows and publishes readings for three. The daily quota,
 * the per-minute throttle and the per-tenant ceiling are all readable and are
 * probed by the `quota` check. The per-second spike arrest is not, and folding
 * it in would let a healthy minute-bucket reading imply something about
 * second-by-second headroom that Keap never said.
 *
 * ## Verified two ways on 2026-08-11
 *
 * 1. **The vendor says so, in as many words.** From the quota documentation:
 *    "We additionally have a per-second spike policy in place for which we do
 *    not return metrics; The default rate for this policy is 25 calls per
 *    second." The Personal Access Token page states a second, tighter figure
 *    for that credential type — 10 queries per second.
 * 2. **Nothing on the wire.** A live response carries
 *    `x-keap-product-spike-limit` — but empty, and it is the only member of its
 *    family: there is no `-available`, no `-used`, no `-time-unit` and no
 *    `-interval` to go with it, unlike all three of the families the `quota`
 *    check does read. A lone ceiling with no counter is not headroom.
 *
 * ## What that means in practice
 *
 * A burst that trips spike arrest is refused with a 429 that arrives without
 * warning, and the documented remedy is client-side: spread the calls out.
 * Keap's own best-practice list says to "handle 429 responses gracefully … use
 * exponential backoff … and respect the retry-after header if present" —
 * behaviour a caller implements, not a number a health check can read.
 */
const spikeRate: HealthCheckDefinition = {
  key: "spike-rate",
  title: "Per-second spike headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Keap enforces a per-second spike-arrest policy and states plainly that it publishes no " +
      'metrics for it: "We additionally have a per-second spike policy in place for which we do ' +
      'not return metrics; The default rate for this policy is 25 calls per second" (10/second ' +
      "for a Personal Access Token or Service Account Key). The wire agrees — a response carries " +
      "x-keap-product-spike-limit and no matching -available, -used, -time-unit or -interval " +
      "header, where all three readable families carry the full set. The remedy is client-side " +
      "pacing and backoff on 429. The three windows Keap DOES publish — daily quota, per-minute " +
      "throttle and the per-tenant ceiling — are reported by the `quota` check instead.",
  },
};

export default spikeRate;
