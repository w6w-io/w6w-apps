import type { HealthCheckDefinition } from "@w6w/types";

/**
 * There is no vendor platform to be up or down.
 *
 * Formidable Forms is a WordPress plugin the customer installs on their own
 * site, so nothing Strategy11 (the vendor) operates sits in the request path
 * — every call this App makes goes to the tenant's own host.
 * formidableforms.com exists — it sells licences, serves plugin updates and
 * hosts the docs — but its availability says nothing about whether a
 * workflow's calls will succeed, and pointing a `service` check at it would
 * report a marketing site's uptime as if it were the API's. That would be
 * worse than no check.
 *
 * The question a `service` check would answer is answered instead by the
 * `site` check (`kind: "dependency"`), which probes the customer's own
 * install.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity a declared absence would pin every verdict at `unknown`
 * forever. Informational checks never worsen a verdict; they are carried for
 * display.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Formidable Forms platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Formidable Forms is a self-hosted WordPress plugin, so there is no vendor-operated API " +
      "host to have a status page. formidableforms.com serves licensing, plugin updates and " +
      "docs — none of which are in the request path — so its uptime is not this App's uptime. " +
      "The dependency that can actually fail is the customer's own site, which the `site` " +
      "check probes.",
  },
};

export default service;
