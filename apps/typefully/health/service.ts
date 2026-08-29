import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Typefully up? Declared `unavailable` — there is no vendor status feed to
 * probe, verified three ways on 2026-08-29:
 *
 * 1. **`status.typefully.com` does not serve a status page.** It resolves in
 *    DNS but the TLS certificate does not cover that hostname (a plain `curl`
 *    fails the handshake), and plain HTTP answers a bare `404`.
 * 2. **`typefully.statuspage.io` is the unclaimed-Statuspage decoy**, not a
 *    real page: it answers `200` with ~127,700 bytes of generic Atlassian
 *    HTML — the documented signature of a `*.statuspage.io` subdomain nobody
 *    has claimed (see `apify`'s and `apollo`'s health-check notes in this
 *    pack for the same measurement against other vendors).
 * 3. **`typefully.betteruptime.com` is not a claimed page either** — it
 *    redirects straight to the generic `uptime.betterstack.com` marketing/login
 *    page, not to a Typefully-branded status page.
 * 4. **Typefully's own marketing site links no status page** — its homepage
 *    HTML contains no `status.*` reference of any kind, and the OpenAPI
 *    document extracted for this app names no status/health endpoint either.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in a roll-up, so at the
 * `kind: "service"` default severity (`degraded`) this declared absence would
 * pin the whole App's verdict below `ok` forever.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Typefully platform status",
  kind: "service",
  severity: "informational",
  unavailable: {
    reason:
      "Typefully publishes no status feed of any kind. status.typefully.com does not present a " +
      "valid certificate and answers 404 over plain HTTP; typefully.statuspage.io is an " +
      "unclaimed Statuspage decoy (~127,700 bytes of generic Atlassian HTML); " +
      "typefully.betteruptime.com redirects to Better Stack's generic marketing page rather " +
      "than a claimed status page; and neither the marketing site nor the Public API's OpenAPI " +
      "document names a status or health endpoint. Verified 2026-08-29.",
  },
};

export default service;
