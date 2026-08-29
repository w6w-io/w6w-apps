import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Pushbullet up? — declared `unavailable`, because there is no live page to probe.
 *
 * ## Checked three ways on 2026-08-29
 *
 * **(a) No `status.pushbullet.com`.** DNS does not resolve for that host at all
 * (`curl: (6) Could not resolve host`).
 *
 * **(b) `pushbullet.statuspage.io` is the unclaimed-Statuspage pattern, not a
 * real status page.** Following its redirect chain: `302` to
 * `https://www.statuspage.io`, then `301` to
 * `https://www.atlassian.com/software/statuspage`, then a final `200` serving
 * **127,696 bytes** of Atlassian's own Statuspage marketing page — the same
 * signature (~127,700 B) already catalogued pack-wide as the tell for an
 * unclaimed `*.statuspage.io` subdomain (see e.g. Apify's `health/service.ts`
 * for the same check on a real, claimed page for comparison). Pushbullet never
 * claimed this page.
 *
 * **(c) No status link on Pushbullet's own site.** `pushbullet.com` (fetched
 * live) links to About/Get Started/Help/API/Press/Security/Privacy/Terms —
 * nothing status-shaped.
 *
 * ## Severity
 *
 * `informational`, because an `unavailable` entry always reports `unknown`,
 * and `unknown` outranks `ok` in the roll-up — any other severity would pin
 * this App's verdict at `unknown` forever. `covers: ["*"]` and no `network`
 * block: this check makes no request at all.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Pushbullet platform status",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Pushbullet publishes no live status page. status.pushbullet.com does not resolve, and " +
      "pushbullet.statuspage.io redirects through Statuspage's own marketing site (127,696 " +
      "bytes) rather than serving a claimed status page — the standard unclaimed-Statuspage " +
      "signature. Pushbullet's own site (About/Help/API/Press/Security/Privacy/Terms) links to " +
      "nothing status-shaped either. Credential liveness is covered by the derived `auth:" +
      "access-token` check, and API rate-limit headroom — which IS readable — by `rate-limit`.",
  },
};

export default service;
