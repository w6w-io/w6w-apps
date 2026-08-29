import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Missive up? — declared `unavailable` rather than guessed.
 *
 * Missive has a real, live status page at `status.missiveapp.com` ("Missive
 * status", listing components including "REST API"), verified 2026-08-29 —
 * but it is not an Atlassian Statuspage or any other feed this pack knows how
 * to read machine-readably:
 *
 *  - The standard Statuspage paths refuse outright: `GET
 *    status.missiveapp.com/api/v2/summary.json` and `/api/v2/status.json`
 *    both 404 with a real `Cannot GET …` body (not a catch-all HTML shell),
 *    and the decoy `missiveapp.statuspage.io` is the unclaimed-page signature
 *    (127,719 bytes of HTML — the exact size this pack has already fingerprinted
 *    as "nobody claimed this Statuspage instance" on Apollo and Algolia).
 *  - `/history.atom` and `/history.rss` both answer 200 with the SAME 5,061-byte
 *    HTML shell as the page root — an SPA catch-all, not a feed.
 *  - The page is built on **PagerDuty's own status-page product** (cookie
 *    `pd_status_page_version`, a `status_page_id` in PagerDuty's own id format,
 *    client JS referencing `api.pagerduty.com` and the Ably realtime SDK for
 *    live updates). Its one same-origin data endpoint, `GET /api/data`,
 *    returns only static page layout (component names, the page's own CSS/copy)
 *    — no current incident or component-state data; that arrives over a
 *    realtime channel this app cannot subscribe to from a stateless probe.
 *    `GET api.pagerduty.com/status-pages/…` itself answers 401 — it requires
 *    a PagerDuty API credential this app does not hold and has no reason to.
 *
 * `severity: "informational"` so this can never worsen a roll-up verdict on
 * its own — it is a documented absence, not a broken probe.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Missive platform status",
  description:
    "Missive publishes a real status page at status.missiveapp.com, but it runs on PagerDuty's " +
    "status-page product behind a realtime (Ably) channel and an authenticated api.pagerduty.com " +
    "backend — there is no static JSON/Atom/RSS feed this app can read anonymously, so the " +
    "absence is declared rather than guessed at.",
  kind: "service",
  scope: "app",
  credential: "none",
  severity: "informational",
  unavailable: {
    reason:
      "status.missiveapp.com is a real PagerDuty-hosted status page (verified 2026-08-29), but " +
      "its current-state data is delivered over an authenticated realtime channel, not a static " +
      "feed — the standard Statuspage JSON paths 404 for real (not a catch-all), " +
      "/history.atom and /history.rss both return the page's own SPA HTML shell, and the " +
      "page's api.pagerduty.com backend requires a PagerDuty credential this app has no reason " +
      "to hold.",
  },
};

export default service;
