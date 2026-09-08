import type { HealthCheckDefinition } from "@w6w/types";

/**
 * How much request-rate headroom is left? Declared `unavailable` — the evidence for a
 * reliable reading is too thin to build a probe on.
 *
 * The collection documents `X-Rate-Limit-Limit`, `X-Rate-Limit-Remaining` and
 * `X-Rate-Limit-Reset` in exactly one place: `Access-Control-Expose-Headers` on one captured
 * response, and a live example of the trio on exactly one endpoint
 * (`GetCurrentTotalsForScope`, not covered by this app) —
 *
 *     X-Rate-Limit-Limit: 1s
 *     X-Rate-Limit-Remaining: 3
 *     X-Rate-Limit-Reset: 2025-06-11T05:18:51.0588326Z
 *
 * `X-Rate-Limit-Limit`'s value (`"1s"`) is a WINDOW DURATION, not a request ceiling — the
 * opposite shape from every other vendor's rate-limit header this pack has seen, and
 * inconsistent with treating it as a `HealthQuota.limit` number. With only one example, on
 * one uncovered endpoint, there is no confirmation these headers appear consistently across
 * the endpoints this app actually calls, nor what "remaining" resets to between windows. `kind:
 * "quota"` describes what a check like this would answer, but no reliable one could be built
 * from what's documented, so this is left as a declared absence.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "The collection documents X-Rate-Limit-Limit/Remaining/Reset headers in only one " +
      "place (Access-Control-Expose-Headers) with a live example on exactly one endpoint " +
      "(GetCurrentTotalsForScope, which this app does not cover). X-Rate-Limit-Limit's " +
      'observed value ("1s") is a window duration, not a request-count ceiling, which ' +
      "does not fit HealthQuota.limit's shape, and one example is not enough to confirm " +
      "these headers appear on the endpoints this app actually calls.",
  },
};

export default quota;
