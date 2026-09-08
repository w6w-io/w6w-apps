import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Yelp up?
 *
 * Checked live 2026-09-06, two candidate hosts, both dead ends:
 *
 *  - `status.yelp.com` (every path, including `/` itself and
 *    `/api/v2/summary.json`) answers a bare `403` with an empty body,
 *    identical with and without a browser-shaped `User-Agent` — an edge/WAF
 *    block against server-side clients, the same signature this pack's
 *    `campaignmonitor` app already documented for its own status host.
 *  - `yelp.statuspage.io/api/v2/summary.json` answers `401` with the plain
 *    text `"Your page is a private page. Please include an API key to
 *    access this resource."` — a genuinely-claimed Atlassian Statuspage
 *    instance (an unclaimed decoy 302s to statuspage.io's own marketing
 *    page instead, which this is not), but one Yelp has made private, the
 *    same "claimed but access-gated" shape as this pack's `deel` app.
 *
 * Neither host answers with anything this app could safely probe
 * unauthenticated — a private Statuspage instance needs an API key this app
 * has no way to obtain, and the WAF block on `status.yelp.com` is
 * indistinguishable from "down" on every path tried. This is a declared
 * absence, not a gap (`core/docs/build-a-w6w-app.md`).
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, which outranks `ok` in a roll-up, so any other severity
 * would pin this App at `unknown` forever. The derived `auth:oauth2` check
 * (from `../auth/oauth2.ts`'s `test` hook, `GET partner-api.yelp.com/token/v1/businesses`)
 * is the automatable signal for "is the Leads API working" for anyone
 * holding a live connection.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Yelp platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Yelp publishes no usable machine-readable status feed for the Leads API: " +
      "status.yelp.com answers a bare 403 (WAF/edge block) on every path tried, and " +
      "yelp.statuspage.io/api/v2/summary.json is a genuinely-claimed but private Statuspage " +
      "instance (401 'Your page is a private page') — both checked live 2026-09-06. The " +
      "auth:oauth2 check (GET partner-api.yelp.com/token/v1/businesses) is the automatable " +
      "signal.",
  },
};

export default service;
