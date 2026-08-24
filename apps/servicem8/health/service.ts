import type { HealthCheckDefinition } from "@w6w/types";

/**
 * ServiceM8 publishes no machine-readable status service.
 *
 * Checked three ways, 2026-08-24:
 *
 * **`servicem8.statuspage.io`** — the guessable Atlassian Statuspage subdomain
 * — is **unclaimed**: `GET /api/v2/summary.json` 302-redirects to
 * `https://www.statuspage.io`, Atlassian's own marketing site, with the
 * requested path discarded. This is the standard unclaimed-subdomain signature
 * documented elsewhere in this pack.
 *
 * **`servicem8.freshstatus.io`** answers `200`, but the body is Freshstatus's
 * own "page does not exist" catch page (it contains the literal strings
 * "Freshstatus" and "does not exist"), not a ServiceM8 status page — a
 * different flavour of the same trap: a *claimed-looking* host that is
 * actually the platform's own generic 404.
 *
 * **`www.servicem8.com/status` and the developer portal itself** carry no link
 * to any status page, machine-readable or otherwise — neither the marketing
 * site's footer/nav nor `developer.servicem8.com`'s guide pages
 * (`getting-started`, `authentication`, `http-response-codes`) mention one.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, which outranks `ok` in a roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 * `health/api.ts` is the check that actually probes `api.servicem8.com`.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "ServiceM8 platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "ServiceM8 runs no status service a machine can read: the guessable servicem8.statuspage.io " +
      "is unclaimed (302 to statuspage.io's own marketing site), servicem8.freshstatus.io answers " +
      "200 with Freshstatus's generic 'page does not exist' catch page rather than a real status " +
      "page, and neither www.servicem8.com nor developer.servicem8.com link to one. See the `api` " +
      "check for a live, unsigned probe of the host every action here actually calls.",
  },
};

export default service;
