/**
 * Is Bannerbear up?
 *
 * ## The linked status page is real but gives back nothing machine-readable
 *
 * `bannerbear.com`'s own footer links `https://status.bannerbear.com/`
 * (confirmed 2026-08-29 via `curl -sL https://bannerbear.com/` → 301 to
 * `www.bannerbear.com` → `<a href="https://status.bannerbear.com/">`), so this
 * is not a guessed or decoy host.
 *
 * That page, though, is a client-rendered single-page app: its own HTML
 * carries `window["webpackJsonphyperping-status-page"]`, its `last-modified`
 * header reads October 2023, and every plausible JSON path answers the
 * identical 2,532-byte `text/html` shell rather than data:
 *
 *   | Path                     | Status | Content-Type | Bytes |
 *   | ------------------------ | ------ | ------------ | ----- |
 *   | `/`                      | 200    | text/html    | 2,532 |
 *   | `/status.json`           | 200    | text/html    | 2,532 |
 *   | `/api/status.json`       | 200    | text/html    | 2,532 |
 *   | `/api/v2/summary.json`   | 200    | text/html    | 2,532 |
 *   | `/index.json`            | 200    | text/html    | 2,532 |
 *
 * Every candidate path returns THE SAME bytes — the SPA's own catch-all
 * shell — which is the tell that none of them is a real route. That rules out
 * both the Statuspage-shaped paths this pack usually finds and the
 * `/status.json` shape Hyperping-hosted pages elsewhere in this pack (e.g.
 * `lemlist`'s `status.lempire.com/status.json`, verified live as genuine
 * `application/json`) actually serve — this particular deployment is stale
 * and does not expose it.
 *
 * This is the same shape as this pack's `checkly` finding: "none usable (the
 * page is an SPA catch-all; the old status instance is stale)". Declared here
 * rather than guessed at, per `HEALTHCHECKS.md`: an entry with `unavailable`
 * and `severity: "informational"` is a positive fact, not a silent gap — and
 * without the explicit severity a permanently `unknown` check would drag down
 * every roll-up that reads this App's health forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Bannerbear platform status",
  description:
    "status.bannerbear.com is a stale client-rendered status page (last-modified 2023) with no " +
    "reachable JSON, RSS, or Atom feed — every candidate path answers the same SPA shell.",
  kind: "service",
  scope: "app",
  credential: "none",
  severity: "informational",
  unavailable: {
    reason: "Bannerbear links status.bannerbear.com from its own site, but that page is a stale " +
      "client-rendered SPA (webpackJsonphyperping-status-page, last-modified October 2023) with " +
      "no machine-readable summary.json, status.json, RSS, or Atom endpoint — every candidate " +
      "path answers the identical 2,532-byte HTML shell rather than data.",
  },
};

export default service;
