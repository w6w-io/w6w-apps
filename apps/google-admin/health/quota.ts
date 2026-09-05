import type { HealthCheckDefinition } from "@w6w/types";

/**
 * The Admin SDK Directory API exposes no headroom to read — no rate-limit
 * response headers and no quota-balance endpoint. Declared rather than
 * omitted, for the same reason as an absent status service: a host should be
 * able to tell "we cannot know" from "nobody looked".
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and
 * an informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Google publishes no headroom endpoint or rate-limit headers for the Admin SDK Directory API. The per-user default (2,400 queries/min/project) is visible only in the Google Cloud console; exhaustion surfaces as 403 `userRateLimitExceeded`/`quotaExceeded` or 429 `rateLimitExceeded`.",
  },
};

export default quota;
