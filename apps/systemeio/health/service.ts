import type { HealthCheckDefinition } from "@w6w/types";

/**
 * systeme.io publishes no status page — checked three ways on 2026-08-24.
 *
 * **(a) `status.systeme.io`** — DNS resolves nowhere useful; the host answers
 * `404` with a 24-byte body, not a status product of any kind.
 *
 * **(b) `systemeio.statuspage.io/api/v2/summary.json`** — the standard
 * Atlassian Statuspage guess. It 302s to `https://www.statuspage.io`, which
 * itself 301s to `https://www.atlassian.com/software/statuspage`, landing on a
 * **127,696-byte** marketing page. That is the known unclaimed-`*.statuspage.io`
 * signature (~127,700 B of HTML redirecting through the Statuspage marketing
 * site) — this subdomain was never claimed by systeme.io, not a status page
 * that happens to be quiet.
 *
 * **(c) `systemeio.instatus.com` / `systeme.instatus.com`** — the equivalent
 * guess for Instatus. Both return a bare `500` with a 5-byte body: neither
 * subdomain is provisioned at all.
 *
 * No footer link on `systeme.io` itself points at a status page either. This
 * is a declared **absence**, not a probe the vendor's infrastructure merely
 * makes hard to reach (contrast Campaign Monitor's WAF-blocked-but-real page) —
 * there is nothing here to be blocked from.
 *
 * `informational` is load-bearing: an `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in the roll-up, so any other severity
 * would pin this App's verdict at `unknown` forever. Whether `api.systeme.io`
 * itself is reachable is answered instead by the derived `auth:api-key` check
 * (`auth/api-key.ts`), which every Action's Connection already carries.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "systeme.io platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "systeme.io publishes no status page. status.systeme.io answers 404 with a 24-byte body. " +
      "systemeio.statuspage.io/api/v2/summary.json 302s through www.statuspage.io to a " +
      "127,696-byte Atlassian marketing page — the known signature for an unclaimed " +
      "*.statuspage.io subdomain, not a quiet status page. systemeio.instatus.com and " +
      "systeme.instatus.com both answer a bare 500 with a 5-byte body: neither is provisioned. " +
      "No footer link on systeme.io points at a status page either. Reachability of the API " +
      "itself is reported by the derived auth:api-key check instead.",
  },
};

export default service;
