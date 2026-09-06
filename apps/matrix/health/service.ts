/**
 * Is Matrix up? — the question does not apply, and saying so is the point.
 *
 * Matrix is a federated **protocol**, not a hosted service: this Connection's
 * homeserver could be `matrix.org`, an organisation's own Synapse install, or
 * any of thousands of independently-run servers, each with its own uptime
 * story. There is no single vendor platform behind a Connection for a status
 * page to describe — `instance` is the check that answers the real question,
 * by asking the Connection's own homeserver directly.
 *
 * The Matrix.org Foundation does run `status.matrix.org` — a real, machine-
 * readable Atlassian Statuspage instance (verified 2026-09-06 via its own
 * `/api/v2/summary.json`) — and it is worth recording why that is not used
 * here: every one of its 17 components (`Synapse`, `matrix.org`, `Outbound
 * federation`, `matrix.to`, `federationtester.matrix.org`, the IRC/Slack/XMPP
 * bridges, `conference.matrix.org`, …) describes the Foundation's own free
 * `matrix.org` homeserver and its bridges specifically — one homeserver among
 * an unknowable number this app can be connected to, and not even the one a
 * self-hosted deployment uses.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict — an
 * app whose protocol has no single vendor to be up is not a degraded app.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Matrix platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Matrix is a federated protocol, not a hosted service, so there is no single vendor " +
      "platform behind a Connection — the `instance` check asks this Connection's own " +
      "homeserver instead. The Matrix.org Foundation's own status.matrix.org (a real, " +
      "machine-readable Statuspage instance, verified 2026-09-06) covers only its own free " +
      "matrix.org homeserver and its bridges, one homeserver among an unknowable number of " +
      "independently-run instances this app can point at.",
  },
};

export default service;
