import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Telnyx exposes no headroom to read. The 6.7 MB OpenAPI document was
 * searched for every spelling of "rate limit" (2026-09-05): none of the
 * handful of hits document a response header or a quota/usage endpoint —
 * they describe fixed per-feature ceilings in prose (e.g. resend cooldowns,
 * per-enterprise reputation-refresh limits) or a `queued_reason` field on a
 * message noting it waited due to internal rate limiting, not a figure this
 * app could read in advance. There is no counter to probe.
 *
 * Declared rather than omitted, for the same reason as an absent status
 * feed: a host should be able to tell "we checked and there is nothing" from
 * "nobody looked". `severity: "informational"` keeps an `unavailable` entry's
 * permanent `unknown` from ever worsening a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Telnyx publishes no rate-limit response headers or quota/usage endpoint in its OpenAPI " +
      "document. Messaging queues rather than exposing a counter, and other resources apply " +
      "fixed per-feature ceilings documented only in prose, so there is nothing to read.",
  },
};

export default quota;
