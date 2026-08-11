/**
 * Is the vendor up? — Fireflies publishes nothing a machine can read, and
 * saying so is a positive fact rather than an omission.
 *
 * This one is worth spelling out because the status page LOOKS alive.
 * `https://status.fireflies.ai/` answers `HTTP 200` with a rendered
 * Freshstatus shell — but the server-rendered props embedded in that very page
 * carry the vendor's own verdict on itself (measured 2026-08-11):
 *
 * ```
 * "userReferer":"http://fireflies.freshstatus.io/",
 * "accountDetails":{"status":"Not Found",
 *   "response":{"status":404,"data":{"detail":"Account with the subdomain does not exist"}},
 *   "statusCode":404,"isError":true}
 * ```
 *
 * status.fireflies.ai is a dangling CNAME to a Freshstatus tenant that no
 * longer exists. That is why `/api/v2/status.json`, `/api/v1/status`, `/rss/`
 * and `/history.atom` all 404 into the same HTML shell, and why no `feed:`
 * declaration is possible: there is no incident log to read, not even an empty
 * one. Freshstatus' public API (`public-api.freshstatus.io`, which the
 * freshservice app in this pack does use) is keyed by an account id this
 * subdomain has never resolved to.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity this declared absence would pin the app's verdict at
 * `unknown` forever. The live signals are the `api` reachability check and the
 * derived `auth:api-key` credential check.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Fireflies platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "status.fireflies.ai answers HTTP 200 but is a dangling Freshstatus tenant — its own " +
      'server-rendered props report 404 "Account with the subdomain does not exist", and ' +
      "/api/v2/status.json, /api/v1/status, /rss/ and /history.atom all 404 into the HTML " +
      "shell. There is no JSON API and no Atom/RSS feed to declare. The `api` reachability " +
      "check and the derived `auth:*` check are the automatable signals.",
  },
};

export default service;
