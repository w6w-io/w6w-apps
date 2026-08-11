import type { HealthCheckDefinition } from "@w6w/types";

/**
 * TidyCal publishes no status page, so this declares `unavailable` with a reason
 * rather than pretending to probe one.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity this declared absence would pin the app's verdict at `unknown`
 * forever.
 *
 * ## Checked four ways on 2026-08-11
 *
 * 1. **DNS.** `status.tidycal.com` → **NXDOMAIN**. So does `status.tidycal.io`.
 *    There is nothing to fetch.
 * 2. **The Statuspage trap.** `tidycal.statuspage.io` *does* resolve — Atlassian
 *    wildcards the whole zone — and answers **HTTP 200** to
 *    `/api/v2/summary.json`. It is not TidyCal's status page:
 *
 *      | request                                          | status | bytes   | content-type   |
 *      | ------------------------------------------------ | ------ | ------- | -------------- |
 *      | `tidycal.statuspage.io/api/v2/summary.json`       | 200    | 127,719 | **text/html**  |
 *      | `tidycal.statuspage.io/`                          | 200    | 127,719 | text/html      |
 *
 *    Same byte count, same md5 (`6158499584bf…`) for both — it is Atlassian's
 *    unclaimed-subdomain page served for every path, and 127,7xx bytes of HTML
 *    is the known signature of exactly that. A check that trusted the 200 would
 *    report "TidyCal is fine" forever, including during a real outage.
 * 3. **The Instatus trap, for completeness.** `tidycal.instatus.com` answers 200
 *    with 222,453 bytes of HTML — the same unclaimed-host pattern on the other
 *    common provider.
 * 4. **The vendor's own reference.** TidyCal's OpenAPI document
 *    (`info.description`, the full reference) mentions no status page, no
 *    incident feed and no uptime URL anywhere in its 4 KB of prose.
 *
 * ## What answers the question instead
 *
 * `health/api.ts` — an unauthenticated probe of `tidycal.com/api/me`. It is a
 * `dependency` check rather than a `service` one on purpose: it proves *the API
 * is answering us*, which is a narrower and honestly weaker claim than "the
 * vendor has declared itself healthy". Filing it as `service` would overstate
 * what a single request from one host can know.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Vendor status page",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "TidyCal publishes no status page. status.tidycal.com and status.tidycal.io are NXDOMAIN; " +
      "tidycal.statuspage.io resolves only because Atlassian wildcards that zone and answers " +
      "127,719 bytes of unclaimed-subdomain HTML to every path including /api/v2/summary.json " +
      "(tidycal.instatus.com does the same with 222,453 bytes), so neither is a usable feed; and " +
      "the vendor's own API reference names no status URL or incident feed. API reachability is " +
      "reported by the `api` check instead.",
  },
};

export default service;
