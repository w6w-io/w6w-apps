import type { HealthCheckDefinition } from "@w6w/types";

/**
 * No headroom to read. Measured live (2026-09-05): an unauthenticated call to
 * `/rest/servicedeskapi/info` carries no `X-RateLimit-*` (or any rate-limit)
 * response header, and the vendor's own docs describe only dynamic,
 * cost-based limits with no published headroom endpoint — the same
 * conclusion the sibling `jira` app reached for the platform API this one
 * shares a host with. Declared rather than omitted, so a host can tell
 * "we cannot know" from "nobody looked".
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
      "Atlassian applies dynamic, cost-based limits with no published headroom endpoint. No X-RateLimit-* (or other quota) header was observed on any servicedeskapi response, authenticated or not; a 429 carries only Retry-After.",
  },
};

export default quota;
