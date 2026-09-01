/**
 * Is Tableau up? — there is no single "Tableau" to ask.
 *
 * Tableau Server is self-hosted software: whatever `instance` reports IS the
 * whole answer, because the server is the operator's own box (or container,
 * or VM) and no vendor status page could describe it.
 *
 * Tableau Cloud IS a hosted service, but there is no single machine-readable
 * feed for it. Verified 2026-09-01: `status.tableau.com` does not resolve,
 * and `trust.tableau.com` redirects to the generic `trust.salesforce.com` hub
 * — a 53 KB HTML shell with no per-product JSON, RSS or Atom found, and no
 * pod-specific path this app could derive from a server address anyway
 * (Tableau Cloud is pod-hosted — `10ax`, `us-east-1`, `prod-uk-a`, … — so even
 * a working feed would need to be per-pod, not per-app).
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict — an
 * app with no single vendor status to watch is not a degraded app.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Tableau platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Tableau Server is self-hosted software with no vendor status to watch — the " +
      "`instance` check asks this connection's own server instead. For Tableau Cloud, no " +
      "machine-readable status feed was found: status.tableau.com does not resolve, and " +
      "trust.tableau.com redirects to the generic trust.salesforce.com hub (verified " +
      "2026-09-01, 53 KB of HTML with no JSON/RSS/Atom endpoint), which is also pod-hosted " +
      "rather than behind one fixed feed a manifest could name statically. `instance`'s direct " +
      "reachability probe is what answers the practical question instead.",
  },
};

export default service;
