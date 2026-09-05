/**
 * Is PDFMonkey up? — declared absent, not faked.
 *
 * `status.pdfmonkey.io` is a REAL, vendor-specific status page (title
 * "PDFMonkey Status", server-rendered with live monitors for the API,
 * generation latency, and system queue size, updown.io-powered — confirmed
 * 2026-09-05 by a genuine active incident banner about a DNS propagation
 * issue, not a decoy default page). The obvious `*.statuspage.io` alias
 * (`pdfmonkey.statuspage.io`) is the unclaimed Atlassian decoy: it 302s
 * straight to `www.atlassian.com/software/statuspage`, not to PDFMonkey's
 * own incidents.
 *
 * Despite being real, `status.pdfmonkey.io` exposes no machine-readable
 * surface: every conventional feed/API path checked (`/history.atom`,
 * `/history.rss`, `/feed`, `/feed.atom`, `/feed.rss`, `/api/v1/status`,
 * `/status.json`, `/api/status`) answers 200 with the identical ~48 KB
 * client-rendered shell, and the page embeds no inline JSON data blob to
 * scrape either. There is therefore nothing to declare a `feed` against,
 * and `w6w.network.allow` intentionally does not include this host — an App
 * has no business reaching a status host from an Action.
 *
 * `unavailable` is a first-class, honest answer per rfcs/healthcheck.md
 * "Declaring absence". `severity: "informational"` so this entry never pins
 * the App's roll-up verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "PDFMonkey platform status",
  description:
    "status.pdfmonkey.io is real (updown.io-powered) but publishes no RSS/Atom feed or JSON API " +
    "at any conventional path.",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.pdfmonkey.io is a real, vendor-operated status page with no RSS/Atom/JSON surface " +
      "to probe or parse; the *.statuspage.io alias is an unclaimed Atlassian decoy.",
  },
};

export default service;
