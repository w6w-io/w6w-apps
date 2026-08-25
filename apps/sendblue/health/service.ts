import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Sendblue up? Declared unavailable — there is no usable machine-readable
 * feed, checked two ways on 2026-08-25:
 *
 * **`sendblue.statuspage.io`** is the classic unclaimed-Statuspage decoy: it
 * 302-redirects to `https://www.statuspage.io` (the vendor's own marketing
 * homepage), which is exactly what an unclaimed page id does. It is not
 * Sendblue's status page at all.
 *
 * **`status.sendblue.com`** IS real and claimed — it answers 200 with a
 * genuine, Sendblue-branded status page (cookies, session state, its own
 * `/history` route), unlike the decoy above. But it is a bespoke
 * server-rendered app, not a known status-page product: none of
 * `/api/v2/summary.json`, `/api/v2/status.json`, `/api/status`, `/status.json`,
 * `/api/health`, `.well-known/status`, an RSS `/rss`/`/feed`, or a
 * `<meta name="generator">` tag resolved to anything — every one of those
 * paths 404s with the same generic HTML error page. There is no discoverable
 * JSON, Atom, or RSS document to declare as a `feed`.
 *
 * Per `HEALTHCHECKS.md`, a real-but-unparseable page is a declared absence,
 * not a guess: `severity: "informational"` so this entry never pins the
 * app's overall verdict at `unknown` forever.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Sendblue platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "sendblue.statuspage.io is an unclaimed Statuspage id (302s to statuspage.io's own " +
      "marketing homepage). status.sendblue.com is real and Sendblue-branded but is a bespoke " +
      "app with no discoverable machine-readable feed: /api/v2/summary.json, /api/v2/status.json, " +
      "/api/status, /status.json, /api/health, .well-known/status, and an RSS /rss or /feed all " +
      "404 with the same generic error page (checked 2026-08-25).",
  },
};

export default service;
