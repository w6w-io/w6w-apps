/**
 * Is OpenRouter up? — it publishes no usable machine-readable status.
 *
 * Verified live 2026-08-29, two candidate surfaces, neither usable:
 *
 * **1. `status.openrouter.ai` is a client-rendered SPA with no JSON/RSS/Atom
 * output.** It answers `200 text/html` with `<title>OpenRouter Status</title>`
 * (a bespoke page built on OnlineOrNot, per its `data-domain="dashboard.onlineornot.com"`
 * analytics tag) — every path this pack's other apps read for a machine-readable
 * feed (`/api/v2/summary.json`, `/api/v2/status.json`, `/rss`, `/feed`,
 * `/history.rss`, `/badge.json`, `/status.json`) 404s with the same HTML shell.
 *
 * **2. `openrouter.statuspage.io` is an unclaimed Statuspage decoy.** It 302s
 * to `https://www.statuspage.io` (Atlassian's own marketing page), the
 * signature of a Statuspage instance nobody has claimed for this vendor — not
 * a real status page at all.
 *
 * So this is a declared absence, not a gap: there is nothing machine-readable
 * to fetch. `severity: "informational"` is load-bearing — an `unavailable`
 * entry always reports `unknown`, and `unknown` outranks `ok` in a roll-up, so
 * at any other severity this would pin the App's verdict at `unknown` forever.
 * The derived `auth:api-key` check (from `../auth/api-key.ts`'s `test` hook,
 * `GET /key`) is the automatable signal for "is OpenRouter working" — it fails
 * the same way a real outage would, for anyone with a live key.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "OpenRouter platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.openrouter.ai is a client-rendered SPA (OnlineOrNot-hosted) with no JSON/RSS/Atom " +
      "output — every summary/status/feed path 404s to the same HTML shell, confirmed live " +
      "2026-08-29. openrouter.statuspage.io is an unclaimed Statuspage instance that 302s to " +
      "Atlassian's own marketing page. The auth:api-key check (GET /key) is the automatable signal.",
  },
};

export default service;
