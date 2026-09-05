/**
 * Is Jira Data Center up? — there is no vendor to ask.
 *
 * Unlike Jira Cloud (a multi-tenant service Atlassian operates, covered by a
 * Statuspage feed the sibling `jira` app in this pack probes), Jira Data
 * Center and Jira Server are software a customer installs and runs
 * themselves. Whatever `instance.ts` reports IS the whole answer — the
 * instance is the operator's own box, cluster or container, and no vendor
 * status page could describe it.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict — an
 * app with no single vendor status to watch is not a degraded app.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Jira platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Jira Data Center and Jira Server are self-hosted software with no vendor status to " +
      "watch — the `instance` check asks this connection's own instance instead. There is no " +
      "single Jira Data Center deployment for a status page to describe.",
  },
};

export default service;
