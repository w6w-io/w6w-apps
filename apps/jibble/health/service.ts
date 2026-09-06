import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Jibble up? Declared `unavailable` — no verifiable status page was found.
 *
 * `status.jibble.io` resolves (200, title "Jibble Status", `<meta name="description"
 * content="Real-time status and incident updates for Jibble services">`) but it is a bespoke
 * Next.js app, not an Atlassian Statuspage or Instatus instance:
 *
 *   - `GET /api/v2/status.json` (the Statuspage v2 convention) answers **404**, a Next.js
 *     "Page not found" shell — there is no machine-readable summary endpoint at the
 *     conventional path.
 *   - The page ships no `<link rel="alternate" type="application/rss+xml">` or Atom feed to
 *     declare via `feed:` either.
 *
 * Per this app's build instructions ("only wire up a status-page integration if you can
 * verify it's real AND covers this specific API — skip entirely if that can't be cheaply
 * confirmed"), this is left as a declared absence rather than a guess at an undocumented
 * shape. `severity: "informational"` keeps a permanently-`unknown` result from pinning the
 * App's overall verdict — the `client-credentials` auth's `test` hook already covers the one
 * question that matters day to day (is Jibble reachable and is this credential live).
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Jibble platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "status.jibble.io is a bespoke Next.js status page, not an Atlassian Statuspage or " +
      "Instatus instance: GET /api/v2/status.json (the Statuspage v2 convention) answers a " +
      '404 Next.js "Page not found" shell, and the page publishes no RSS/Atom feed to ' +
      "declare instead. No machine-readable summary of Jibble's own status could be found " +
      "and verified, so this is left as a declared absence rather than a guess at an " +
      "undocumented endpoint shape.",
  },
};

export default service;
