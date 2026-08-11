import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Pushover runs a status page, but publishes no machine-readable feed — so this
 * declares `unavailable` with a reason rather than pretending to probe, and
 * rather than pointing at the trap next door.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 *
 * ## What was checked, on 2026-08-11
 *
 * `pushover.net` links to **`https://status.pushover.net/`**, so the page is
 * real and vendor-owned. It is a self-hosted status page — its assets are served
 * from `…/fpsp/statuspage/…`, not from Atlassian — and it publishes nothing a
 * host could read:
 *
 *   | Path                     | Result                    |
 *   | ------------------------ | ------------------------- |
 *   | `/`                      | 200, 21,825 B of HTML     |
 *   | `/api/v2/summary.json`   | **404**                   |
 *   | `/history.atom`          | **404**                   |
 *   | `/history.rss`           | **404**                   |
 *   | `/feed.xml`              | **404**                   |
 *   | `/index.json`            | **404**                   |
 *
 * ## The trap, named so nobody "fixes" this later
 *
 * `pushover.statuspage.io` **does** answer `200` — with **127,697 bytes** of
 * HTML. That is the signature of an *unclaimed* Atlassian Statuspage subdomain:
 * the generic "create your own status page" marketing shell, served for any
 * unregistered name. It is not Pushover's, it contains no component data, and
 * parsing it as JSON would fail forever while looking like a configured check.
 *
 * The other rejected candidate, `updates.pushover.net`, does not resolve at all.
 *
 * If Pushover ever publishes an Atom or RSS feed, the right fix is a
 * `feed: { url }` declaration — the host fetches and parses it — not a
 * hand-rolled HTML scraper.
 *
 * Nothing is lost meanwhile: the derived `auth:app-token` check validates this
 * Connection's own credential against the live API, and `quota` reads the real
 * monthly allowance. Both say more about whether this integration works than a
 * fleet-wide page would.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Pushover platform status",
  kind: "service",
  scope: "app",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Pushover's status page (status.pushover.net, linked from pushover.net) is self-hosted and " +
      "publishes no machine-readable feed: /api/v2/summary.json, /history.atom, /history.rss, " +
      "/feed.xml and /index.json all 404. The Atlassian-style pushover.statuspage.io answers 200 " +
      "with 127,697 bytes — the signature of an UNCLAIMED Statuspage subdomain, not Pushover's " +
      "page — and must not be used. The per-connection credential and quota checks carry the " +
      "weight instead.",
  },
};

export default service;
