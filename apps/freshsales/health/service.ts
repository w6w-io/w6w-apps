import type { HealthCheckDefinition } from "@w6w/types";

/**
 * freshsales.freshstatus.io (Freshstatus-hosted, same platform as the sibling
 * Freshdesk app's status page) exposes only an HTML incident history — no
 * JSON API and no Atom/RSS feed. Verified: `/history.atom`, `/history.rss`,
 * `/api/v2/status` and `/badge.json` all 404, each returning the same
 * "Status page Powered by Freshstatus" HTML shell. Declaring the absence is a
 * positive fact rather than an omission — a host can render "not knowable"
 * instead of leaving an operator to conclude the publisher forgot.
 *
 * `severity: "informational"` is load-bearing here. An `unavailable` entry
 * always reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at
 * any other severity a declared absence would pin every verdict at `unknown`
 * forever. Informational checks never worsen a verdict; they are carried for
 * display.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Freshsales platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "freshsales.freshstatus.io is a human incident-history page with no JSON API or feed " +
      "(/history.atom, /history.rss, /api/v2/status and /badge.json all 404). The `domain` " +
      "dependency check probes this connection's own account host instead.",
  },
};

export default service;
