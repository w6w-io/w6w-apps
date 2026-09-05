import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Sender up? — declared unavailable, not probed.
 *
 * ## What was checked on 2026-09-05, and why each candidate failed
 *
 * - **`status.sender.net`** does not resolve at all (`Could not resolve host`
 *   — NXDOMAIN), so there is nothing to probe.
 * - **`sender.statuspage.io`** — the Statuspage-hosted-page guess — 302s to
 *   `https://www.statuspage.io`, Statuspage's own marketing site. That is the
 *   signature of an unclaimed Statuspage subdomain, not a real Sender page.
 * - **`sender.freshstatus.io`** answers HTTP 200 (12,198 bytes), which looks
 *   promising until the page is read: it is a client-rendered Next.js shell
 *   whose embedded `__NEXT_DATA__` payload carries
 *   `"accountDetails":{"status":"Not Found","response":{"status":404,
 *   "data":{"detail":"Account with the subdomain does not exist"}}}` — the
 *   200 is the SPA shell, not Sender's status page. This is the same
 *   "HTTP 200 is not proof of a real endpoint" trap the vendor's own API host
 *   exhibits (see `lib/client.ts`), just on a different domain.
 * - **`sender.net/status`** 301-redirects to `www.sender.net/status/`, which
 *   answers a genuine 404 (Sender's own "We lost this page" template) — there
 *   is no status page at that path either.
 *
 * No real, machine-readable (or even human-readable) Sender status page was
 * found anywhere in this search. Per `HEALTHCHECKS.md`, that is stated here as
 * a positive fact rather than left as a silent gap.
 *
 * `severity: "informational"` — required for a declared-unavailable check
 * (omitting it would pin this App's `service` verdict at `unknown` forever,
 * since there is no probe to ever resolve it to `ok`).
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Sender platform status",
  description: "Sender publishes no status page reachable from this search (checked 2026-09-05: " +
    "status.sender.net does not resolve, sender.statuspage.io is an unclaimed redirect, " +
    "sender.freshstatus.io is a 200-with-404-payload decoy, and sender.net/status 404s).",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "No status page could be confirmed as real for Sender (sender.net) as of 2026-09-05.",
  },
};

export default service;
