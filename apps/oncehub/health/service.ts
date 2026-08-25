import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is OnceHub up? — declared absent, not omitted.
 *
 * `status.oncehub.com` is real (its own domain, page title "OnceHub | System
 * Status", linked nowhere from the developer docs but reachable directly) —
 * but it is a bespoke Next.js app, not a Statuspage/Better-Stack/status.io
 * instance, and every machine-readable path tried against it 404s:
 * `/api/v2/summary.json`, `/api/v2/status.json`, `/api/v2/components.json`,
 * `/history.atom`, `/index.json`, `/api/v1/status`. The page's own initial
 * HTML carries no rendered status text at all ("operational" / "degraded" /
 * "outage" all zero matches) — the component grid is fetched client-side
 * after the page loads, behind an API this app cannot identify without
 * executing the page's JavaScript. Verified live 2026-08-25.
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`,
 * and an informational check never worsens a roll-up verdict on its own.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "OnceHub platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.oncehub.com is a real, custom-built (non-Statuspage) status site with no discoverable machine-readable feed — every JSON/Atom/RSS path tried 404s, and the visible status grid loads via a client-side fetch this app cannot reach. Rely on the api-key credential probe instead.",
  },
};

export default service;
