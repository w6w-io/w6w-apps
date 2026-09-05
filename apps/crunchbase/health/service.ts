/**
 * Is Crunchbase up? — declared absence. Checked two ways, both dead ends
 * (verified live 2026-09-05):
 *
 *   - `status.crunchbase.com` does not resolve at all (DNS failure — "Could
 *     not resolve host").
 *   - `crunchbase.statuspage.io` exists but is the unclaimed-Statuspage
 *     decoy: it 302-redirects to `https://www.statuspage.io`, Atlassian's own
 *     marketing homepage, rather than answering as a claimed page. None of
 *     the usual `/api/v2/*.json` paths resolve past that redirect.
 *
 * So there is no vendor-operated, machine-readable status surface to probe.
 * `severity: "informational"` — an `unavailable` entry always reports
 * `unknown`, and this must never worsen a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Crunchbase platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Crunchbase publishes no machine-readable status feed: status.crunchbase.com does " +
      "not resolve (DNS failure), and crunchbase.statuspage.io is an unclaimed Statuspage " +
      "instance that 302s to statuspage.io's own marketing page rather than a real incident " +
      "page (verified 2026-09-05).",
  },
};

export default service;
