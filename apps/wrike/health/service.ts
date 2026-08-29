/**
 * Wrike publishes no usable machine-readable status feed, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity a declared absence would pin every verdict at `unknown`
 * forever.
 *
 * ## Three candidates, all dead ends — checked 2026-08-29
 *
 *  1. **`status.wrike.com`** is a genuine, Wrike-branded status page (real
 *     favicon, `og:site_name: Wrike`, `@WrikeOps` on Twitter) — but it is a
 *     client-rendered single-page app with `<div id="app"></div>` and no
 *     server-side data. Every plausible JSON/RSS route on that host
 *     (`/api/v2/summary.json`, `/status.json`, `/incidents.json`, `/history`,
 *     …) 302-redirects to `www.wrike.com/404/`, and the page's own bundled
 *     JS (`/js/app.js`, 240,827 bytes) contains the literal substring `api`
 *     **zero times** — its data source is not a fetchable URL this app could
 *     name even if `network.allow` were widened for it.
 *  2. **`wrike.statuspage.io`** is the standard **unclaimed**-Statuspage
 *     decoy: it redirects straight to `atlassian.com/software/statuspage`,
 *     127,696 bytes of Atlassian marketing HTML — the exact byte-count
 *     signature this pack already treats as "nobody claimed this page" (see
 *     `HEALTHCHECKS.md`'s note on the 127,720-byte Atlassian trap).
 *  3. **`wrike.freshstatus.io`** answers 200 but its own body reads
 *     "Account with the subdomain does not exist" — the equivalent decoy for
 *     Freshstatus.
 *
 * No RSS/Atom alternative was found either; `errors-api-reference-v4` and the
 * OAuth guide, the two most likely places for one, do not mention a status
 * feed of any kind.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Wrike platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Wrike publishes no fetchable status feed: status.wrike.com is a real, Wrike-branded page " +
      "but a client-rendered SPA whose every plausible JSON/RSS route (summary.json, status.json, " +
      "incidents.json, history) redirects to a 404 and whose bundled JS never references a fetch " +
      "path; wrike.statuspage.io and wrike.freshstatus.io are both unclaimed decoys (confirmed by " +
      "their known byte-signatures / placeholder body text). Credential liveness is covered by the " +
      "derived auth:permanent-token check, and the connected account's own suspension flag by the " +
      "`account` check instead.",
  },
};

export default service;
