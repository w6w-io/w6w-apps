import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Data Center exposes no rate-limit or quota headroom to read. The
 * OpenAPI reference (fetched 2026-09-05) documents no `X-RateLimit-*` header
 * and no usage/limits endpoint anywhere in its ~290 paths — unlike Jira
 * Cloud, which is metered by Atlassian, a self-hosted instance's throughput
 * is whatever its own operator provisioned (JVM heap, database, node count),
 * not a vendor-imposed ceiling this app could probe.
 *
 * Declared rather than omitted, for the same reason as an absent status
 * service: a host should be able to tell "we cannot know" from "nobody
 * looked". `severity: "informational"` — an `unavailable` entry reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Jira Data Center / Server publishes no rate-limit header or quota endpoint — it is " +
      "self-hosted software whose throughput is whatever its own operator provisioned, not a " +
      "vendor-metered ceiling.",
  },
};

export default quota;
