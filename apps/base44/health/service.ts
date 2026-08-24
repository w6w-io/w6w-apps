import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Base44 up? — declared absent, not faked.
 *
 * Two candidates were checked live on 2026-08-24 and both failed:
 *
 *   - `base44.statuspage.io/api/v2/summary.json` answers `200` with 127,696
 *     bytes of HTML titled "Real-Time Incident Communication with Statuspage
 *     | Atlassian" — the documented signature of an UNCLAIMED Statuspage
 *     subdomain (an unclaimed page is ~127,700 B of HTML; a real one, like
 *     this pack's `apps/apify` at `status.apify.com`, is a few KB of JSON).
 *     This is the decoy, not a real status page.
 *   - `status.base44.com` answers `403` with a Cloudflare "Just a moment…"
 *     challenge page regardless of path or `Accept` header — a bot check with
 *     no way through it from a server-side `ctx.fetch`, so even if a real
 *     status page lives behind it, nothing here can read it.
 *
 * `health/api.ts` covers the one thing this app CAN observe directly: whether
 * the Monitoring API surface it calls is reachable at all, via that API's own
 * unauthenticated `/health` endpoint.
 *
 * `severity: "informational"` so this entry never pins the App's roll-up
 * verdict at `unknown` forever, per rfcs/healthcheck.md "Declaring absence".
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Base44 platform status",
  description:
    "No usable machine-readable status surface: base44.statuspage.io is an unclaimed Statuspage " +
    "decoy, and status.base44.com is Cloudflare-gated behind a bot challenge.",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "base44.statuspage.io is an unclaimed Statuspage subdomain (the documented ~127,700-byte " +
      "HTML decoy), and status.base44.com returns a Cloudflare bot-challenge page to any " +
      "non-browser client, so no machine-readable feed can be read from either.",
  },
};

export default service;
