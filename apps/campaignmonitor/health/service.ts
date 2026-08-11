import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Campaign Monitor publishes a status page. A server-side client cannot read it.
 *
 * That is a different fact from "there is no status page", and the distinction
 * is the whole point of this file: the page exists, it is real, it is
 * machine-readable, it covers the API — and a WAF refuses every client that does
 * not present a full desktop-browser `User-Agent`. So this is a declared
 * *absence of a usable probe*, with the exact URLs recorded so that reviving it
 * is a two-line change if the WAF is ever relaxed.
 *
 * ## What is actually there (measured 2026-08-11)
 *
 * `https://status.campaignmonitor.com` is a **StatusCast** page (the RSS
 * document declares `xmlns:sc="http://statuscast.com"` and
 * `<copyright>Copyright 2026 StatusCast</copyright>`), branded for Marigold —
 * Campaign Monitor's parent — and it names Campaign Monitor as the page:
 *
 *     GET /summary.json  → {"PageName":"Campaign Monitor","Domain":"campaignmonitor",
 *                           "StatusText":"Normal","Status":"Available",
 *                           "UnresolvedIncidents":[],"UpcomingIncidents":[]}
 *     GET /status.json   → {"StatusText":"Normal","Status":"Available",
 *                           "InEffectSince":"2026-08-09T05:10:00", …}
 *     GET /rss           → 49,196 B StatusCast RSS
 *
 * and it **does cover the API**: the rendered page carries an `API` group whose
 * components are `API endpoints`, `Transactional SMTP` and `Webhooks`, alongside
 * `Web application`, `Email sending` and `Help Center` groups. (Those components
 * appear only in the HTML; `summary.json` reports a single page-level roll-up
 * and no component list.)
 *
 * ## Why none of that is reachable
 *
 * Every request that does not carry a convincing browser `User-Agent` is
 * answered `403` with a 28-byte body reading `Invalid request blocked (v1)`.
 * Measured across nine `User-Agent` values against `/summary.json`, same IP,
 * same minute:
 *
 *   | User-Agent                                        | Status |
 *   | ------------------------------------------------- | ------ |
 *   | *(absent)*                                        | 403    |
 *   | `curl/8.5.0`                                      | 403    |
 *   | `Deno/2.1.4`                                      | 403    |
 *   | `w6w-healthcheck/1.0`                             | 403    |
 *   | `node`                                            | 403    |
 *   | `Mozilla/5.0`                                     | 403    |
 *   | `Mozilla/5.0 (compatible; w6w/1.0; +https://…)`   | 403    |
 *   | `python-requests/2.31.0`                          | 403    |
 *   | `Go-http-client/2.0`                              | 403    |
 *   | full desktop Chrome 126 UA string                 | **200**|
 *
 * `Deno/x.y.z` is what `ctx.fetch` sends by default, so the host's own fetcher
 * — and the host's `feed:` fetcher, which is the same stack — is blocked. The
 * only thing that gets through is impersonating Chrome, and this app will not
 * do that: a health probe whose correctness depends on defeating the vendor's
 * bot filter is a probe that breaks silently the next time that filter is tuned,
 * and it misrepresents who is calling.
 *
 * ## The alternatives, ruled out
 *
 *  - `status.campaignmonitor.com/api/v2/summary.json`, `/history.atom`,
 *    `/history.rss`, `/index.json` — **not a Statuspage**; each 302s to
 *    `/errors/404`. The Statuspage-shaped paths do not exist here.
 *  - `campaignmonitor.statuspage.io/api/v2/summary.json` — 302 to
 *    `https://www.statuspage.io`, i.e. an **unclaimed** Statuspage subdomain,
 *    not Campaign Monitor's.
 *  - `status.createsend.com` — 302 to `…/login?ReturnUrl=%2F`. A login wall, not
 *    a public status page.
 *  - `trust.campaignmonitor.com` — 301 to the marketing homepage.
 *
 * ## Severity
 *
 * `informational`, and that is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity this declaration would pin the App's verdict at `unknown` forever.
 *
 * The question this check would have answered is instead answered, partially, by
 * `health/api.ts`, which probes the API host directly.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Campaign Monitor platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Campaign Monitor's status page exists and is machine-readable, but is unreachable to a " +
      "server-side client. status.campaignmonitor.com is a StatusCast page for Campaign Monitor " +
      "(Marigold-branded) that serves /summary.json, /status.json and /rss and whose components " +
      "include an API group (API endpoints, Transactional SMTP, Webhooks) — yet a WAF answers " +
      "403 'Invalid request blocked (v1)' to every request without a full desktop-browser " +
      "User-Agent. Measured 2026-08-11 across nine User-Agent strings including an absent one, " +
      "curl, Deno (which is what ctx.fetch sends), python-requests, Go-http-client and a bare " +
      "'Mozilla/5.0': all 403; only a complete Chrome 126 string returned 200. This app will not " +
      "impersonate a browser to defeat that filter. The Statuspage-shaped paths are not an " +
      "alternative: /api/v2/summary.json, /history.atom, /history.rss and /index.json all 302 to " +
      "/errors/404, campaignmonitor.statuspage.io is an unclaimed Statuspage that redirects to " +
      "statuspage.io, status.createsend.com redirects to a login, and trust.campaignmonitor.com " +
      "redirects to the marketing site. Reachability of the API itself is reported by the `api` " +
      "check instead.",
  },
};

export default service;
