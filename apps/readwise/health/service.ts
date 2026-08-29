import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Readwise up? — declared absence.
 *
 * No public, machine-readable Readwise status page could be found on
 * 2026-08-29. Every plausible candidate was checked and ruled out:
 *
 *  - `readwisestatus.com`, `status.readwise.io`, `status.readwise.app` — DNS
 *    does not resolve.
 *  - `readwise.statuspage.io`, `readwisehq.statuspage.io` — the unclaimed
 *    Atlassian Statuspage signature (200, 127,696 bytes, redirects to
 *    `atlassian.com/software/statuspage`), the same size this pack's own
 *    `apify` README documents for an unclaimed `*.statuspage.io` subdomain.
 *  - `readwise.freshstatus.io` — Freshstatus's own 404 page: `{"detail":
 *    "Account with the subdomain does not exist"}`.
 *  - `readwise.instatus.com`, `readwise.betteruptime.com` — both resolve to
 *    the vendor platform's own marketing site, not a claimed Readwise page.
 *  - `status.readwise.com` — redirects straight to `readwise.io`, not a
 *    status page.
 *  - `readwise.io/status`, `readwise.io/help/en/articles` — `404`.
 *  - `readwise.io/api_deets` itself names no status page, and the homepage's
 *    `<head>`/footer link out to none.
 *
 * Stated as a positive fact rather than left as a silent gap, per
 * `HEALTHCHECKS.md`. `severity: "informational"` is load-bearing: an
 * `unavailable` entry always reports `unknown`, and `unknown` outranks `ok` in
 * a roll-up, so anything less would pin this app's verdict at `unknown`
 * forever.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Readwise platform status",
  description: "No public status page was found for Readwise as of 2026-08-29.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Readwise publishes no discoverable status page. Every plausible host (readwisestatus.com, " +
      "status.readwise.io, readwise.statuspage.io, readwise.freshstatus.io, readwise.instatus.com, " +
      "readwise.betteruptime.com, status.readwise.com, readwise.io/status) either fails to resolve, " +
      "shows an unclaimed third-party signature, or redirects to the vendor's own marketing site — " +
      "checked 2026-08-29.",
  },
};

export default service;
