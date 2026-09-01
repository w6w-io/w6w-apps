/**
 * Is Sendy up? — the question does not apply, and saying so is the point.
 *
 * Sendy is **self-hosted software, not a service**: the operator runs it on
 * their own server against their own Amazon SES account. There is no vendor
 * platform behind a connection for a status page to describe — `sendy.co`
 * is the vendor's marketing site and license portal, not an API host, and
 * publishes no status feed of any kind (verified 2026-09-01: no
 * `status.sendy.co`, and `/status`, `/health` off `sendy.co` itself both
 * 404). `sendy.statuspage.io` DOES answer 200, but it is a namesake decoy —
 * its `page.name` is "Sendy" but `page.url` is `status.sendy.eu`, and its
 * components are `app.sendy.nl`, "DHL eCommerce", "Amazon" shipping and
 * similar: an unrelated Dutch parcel-delivery company, not this vendor.
 * `site` is the check that answers the real question, by asking the
 * connection's own installation.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict —
 * an app whose vendor has nothing to be up is not a degraded app.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Sendy platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Sendy is self-hosted software run on the operator's own server and Amazon SES account, " +
      "so there is no vendor platform behind a connection — the `site` check asks this " +
      "connection's own installation instead. sendy.co publishes no status feed of any kind " +
      "(verified 2026-09-01); sendy.statuspage.io answers 200 but is a namesake decoy for an " +
      "unrelated Dutch parcel-delivery company (page.url is status.sendy.eu).",
  },
};

export default service;
