import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Instantly up? — declared `unavailable` rather than guessed.
 *
 * Checked three ways on 2026-08-29, all negative:
 *
 *  1. **`status.instantly.ai`** — does not resolve at all (`NXDOMAIN`,
 *     confirmed with a direct DNS lookup, not just a failed HTTP request).
 *  2. **`instantlyai.statuspage.io/api/v2/summary.json`** and
 *     **`instantly.statuspage.io/api/v2/summary.json`** — both 302-redirect to
 *     `statuspage.io`'s own marketing homepage rather than serving a claimed
 *     page's JSON, the standard signature of an unclaimed/decommissioned
 *     Statuspage subdomain (see `apps/algolia`'s README for the same check
 *     applied elsewhere in this pack).
 *  3. **`instantly.ai`'s own homepage** — no `<a>`/`<link>` anywhere in the
 *     rendered HTML references a `status` path of any kind.
 *
 * No vendor-run status page could be found by any of the usual means this
 * pack checks. `severity: "informational"` so a documented absence can never
 * worsen a roll-up verdict — see `packages/apps/HEALTHCHECKS.md`.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Instantly platform status",
  description: "No machine-readable or HTML status page was found for Instantly as of " +
    "2026-08-29 (status.instantly.ai does not resolve; both statuspage.io subdomains one would " +
    "guess redirect to statuspage.io's own homepage rather than a claimed page), so this app " +
    "declares the absence rather than guessing at an undocumented endpoint.",
  kind: "service",
  scope: "app",
  credential: "none",
  severity: "informational",
  unavailable: {
    reason:
      "Instantly publishes no discoverable status page as of 2026-08-29: status.instantly.ai " +
      "is NXDOMAIN, and the statuspage.io subdomains a vendor of this size would typically claim " +
      "(instantly.statuspage.io, instantlyai.statuspage.io) both redirect to statuspage.io's own " +
      "marketing site rather than a claimed instance.",
  },
};

export default service;
