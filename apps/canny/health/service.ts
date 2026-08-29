/**
 * Is Canny up?
 *
 * Canny publishes a status page at `status.canny.io`, verified live 2026-08-29:
 * it is a **Pingdom Public Reports** page (`<title>Pingdom Public Reports
 * Overview</title>`, logo served from `pingdom-prod-status-page-logos`), not a
 * Statuspage or status.io instance. Pingdom's public-reports product renders a
 * server-side HTML uptime table with no JSON, RSS or Atom output — every path
 * this pack's other Statuspage/status.io apps read (`/api/v2/summary.json`,
 * `/api/v2/status.json`, `/1.0/status/<id>`) 404s here (confirmed live), and
 * Pingdom's public-reports product has no documented feed format at all.
 *
 * So this is a declared absence, not a gap: there is nothing machine-readable
 * to fetch. `severity: "informational"` is load-bearing — an `unavailable`
 * entry always reports `unknown`, and `unknown` outranks `ok` in a roll-up, so
 * at any other severity this would pin the App's verdict at `unknown` forever.
 * The derived `auth:api-key` check (from `../auth/api-key.ts`'s `test` hook,
 * `POST /v1/boards/list`) is the automatable signal for "is Canny working" —
 * it fails the same way a real outage would, for anyone with a live key.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Canny platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.canny.io is a Pingdom Public Reports page (HTML uptime table, no JSON/RSS/Atom " +
      "output) — confirmed live 2026-08-29. The auth:api-key check (POST /v1/boards/list) is the " +
      "automatable signal.",
  },
};

export default service;
