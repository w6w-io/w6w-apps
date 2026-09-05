/**
 * Is LGL's API up? — declared absent, not faked.
 *
 * Checked 2026-09-05: both `status.littlegreenlight.com` and
 * `littlegreenlight.statuspage.io` (302) redirect to `https://www.statuspage.io`
 * and then on to Atlassian's own Statuspage marketing page
 * (`https://www.atlassian.com/software/statuspage`) — the unclaimed-Statuspage
 * decoy pattern seen across this pack (e.g. `hedy`, `base44`): the page name
 * was never registered, so it just bounces to the product's own site. No
 * `/api/v2/summary.json`, `/index.json`, or feed of any kind resolves to a
 * real LGL-owned status page. No other machine-readable status surface
 * (Instatus, Better Stack, incident.io, RSS/Atom) was found for this vendor.
 *
 * `unavailable` is a first-class, honest answer per rfcs/healthcheck.md
 * "Declaring absence" — better than a silent gap or a `check` that always
 * returns `unknown`. `severity: "informational"` so this entry never pins the
 * App's roll-up verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Little Green Light platform status",
  description: "No machine-readable status surface: status.littlegreenlight.com and " +
    "littlegreenlight.statuspage.io both redirect to Statuspage's own unclaimed-page " +
    "destination, and no other status feed for this vendor was found.",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "status.littlegreenlight.com and littlegreenlight.statuspage.io are both unclaimed " +
      "Statuspage redirects to Atlassian's marketing page, not a real LGL status page; no " +
      "other machine-readable status feed was found for this vendor.",
  },
};

export default service;
