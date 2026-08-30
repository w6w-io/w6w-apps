/**
 * Is Mautic up? — the question does not apply, and saying so is the point.
 *
 * Mautic is **self-hosted software, not a service**. There is no vendor
 * running the instance this connection points at, so there is nothing a
 * vendor status page could tell you about it. `instance` is the check that
 * answers the real question, by asking the server itself.
 *
 * The Mautic project does run `status.mautic.org`, and it is worth recording
 * why it is not used here. Verified 2026-08-30 against its own
 * `/api/v2/summary.json`: the page is named "Mautic Community" and its
 * components are the project's own infrastructure and third-party dependents
 * — "Mautic.org website", "Mautic Community Portal/Forums/Documentation",
 * plus auto-monitored vendors it depends on (DigitalOcean, Confluence,
 * GitHub, Auth0, Slack, Cloudflare). None of that is a hosted Mautic
 * product — every component describes the project's own web presence, not
 * any self-hosted instance's application server. (A same-named
 * `mautic.statuspage.io` also exists and is the unclaimed Statuspage decoy:
 * its components are literally "API (example)" and "Management Portal
 * (example)", the default template Statuspage ships to a page nobody has
 * configured.)
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict — an
 * app whose vendor has nothing to be up is not a degraded app.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Mautic platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Mautic is self-hosted software, so there is no vendor platform behind a connection — " +
      "the `instance` check asks this connection's own server instead. The project's own " +
      "status.mautic.org covers mautic.org's website and community infrastructure only " +
      "(verified 2026-08-30 via its own /api/v2/summary.json — components are the project's " +
      "web presence and its own third-party dependents, not any self-hosted instance), and a " +
      "same-named mautic.statuspage.io is the unclaimed Statuspage decoy, its components still " +
      "named 'API (example)' and 'Management Portal (example)'.",
  },
};

export default service;
