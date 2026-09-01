/**
 * Is Luma up? — declared absent, because Luma's Statuspage is not public.
 *
 * Checked three ways on 2026-09-01, the same pattern as Deel's
 * `apps/deel/health/service.ts`:
 *
 *   GET https://status.lu.ma                               -> connection refused (no such host)
 *   GET https://status.luma.com                             -> connection refused (no such host)
 *   GET https://lu-ma.statuspage.io/api/v2/summary.json      -> 302 -> www.statuspage.io
 *       (the unclaimed-Statuspage-subdomain redirect, not Luma's page)
 *   GET https://luma.statuspage.io/api/v2/summary.json       -> 401
 *       {"...":"Your page is inactive. Please include an API key to access this resource."}
 *
 * That 401 is Statuspage's own message for a page whose owner has not made it
 * public — Luma *has* a Statuspage account (the subdomain resolves and is
 * claimed, unlike `lu-ma.statuspage.io`), it just does not serve it. There is
 * nothing to parse and nothing to declare as a feed: not because the vendor
 * publishes nothing, but because what it publishes is private.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up — so at any
 * other severity this absence would pin the app's verdict at `unknown`
 * forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Luma platform status",
  description:
    "Luma's Statuspage subdomain (luma.statuspage.io) is claimed but returns 401 \"page is " +
    'inactive" on every API path, so no machine-readable status surface is available.',
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: 'luma.statuspage.io/api/v2/summary.json answers 401 "Your page is inactive. Please ' +
      "include an API key to access this resource\" (verified 2026-09-01) — Statuspage's own " +
      "message for a page its owner has not published. status.lu.ma and status.luma.com do not " +
      "resolve, and lu-ma.statuspage.io is the unclaimed-subdomain redirect, not Luma's page. " +
      "There is no public status API, feed or page to probe.",
  },
};

export default service;
