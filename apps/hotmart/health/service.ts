/**
 * Is Hotmart up?
 *
 * ## Checked live on 2026-09-05 — no machine-readable status exists
 *
 * `status.hotmart.com` resolves and answers `200` on every path tried,
 * including nonsense ones — the tell of a client-rendered SPA catch-all
 * shell, not a real per-path status API:
 *
 *   | Path                                | Status | Bytes | Content-Type |
 *   | ------------------------------------ | ------ | ----- | ------------ |
 *   | `/`                                  | 200    | 975   | text/html    |
 *   | `/api/v2/summary.json`               | 200    | 975   | text/html    |
 *   | `/api/v2/status.json`                | 200    | 975   | text/html    |
 *   | `/api/v2/components.json`            | 200    | 975   | text/html    |
 *   | `/definitely-not-real-zzz`           | 200    | 975   | text/html    |
 *
 * Every path — real-looking or not — returns the byte-identical 975-byte
 * shell (confirmed: the page is a modern SPA build, not Atlassian
 * Statuspage/Instatus-shaped, and carries no distinct JSON, RSS, or Atom
 * endpoint under any of the paths this pack's other apps have found live
 * elsewhere).
 *
 * `hotmart.statuspage.io` — the generic Statuspage guess — is also checked
 * and is the well-known unclaimed-Statuspage decoy: it 302s straight to
 * `statuspage.io`'s own marketing page, never to a Hotmart-branded one.
 *
 * Declared here rather than left as a silent gap, per `HEALTHCHECKS.md`: an
 * entry with `unavailable` and `severity: "informational"` is a positive
 * fact. Without the explicit severity, this check would sit at `unknown`
 * forever and drag down any roll-up that reads this App's health.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Hotmart platform status",
  description:
    "status.hotmart.com is a client-rendered SPA with no reachable JSON, RSS, or Atom feed — " +
    "every candidate path, including nonsense ones, answers the identical HTML shell.",
  kind: "service",
  scope: "app",
  credential: "none",
  severity: "informational",
  unavailable: {
    reason: "status.hotmart.com answers HTTP 200 with the same 975-byte SPA shell for every " +
      "path tried (including a made-up one), so no path there is a real per-component status " +
      "route. hotmart.statuspage.io is the unclaimed-Statuspage decoy (302s to statuspage.io's " +
      "own marketing page). Hotmart publishes no machine-readable status feed this app could " +
      "find.",
  },
};

export default service;
