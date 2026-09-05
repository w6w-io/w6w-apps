/**
 * Is eBay's API up? — declared unavailable.
 *
 * eBay DOES publish a genuine, API-specific status page at
 * developer.ebay.com/support/api-status — verified via an archived copy
 * (server-rendered HTML table, e.g. "RESOLVED: Trading API ReviseItem,
 * AddItem Call Returning 'System Error'" against the "Trading API"
 * component, "Production" environment). It is not a marketing rollup; it
 * genuinely names individual REST/Trading APIs. But it fails both of this
 * pack's requirements for a wired `service` check:
 *
 *   1. No machine-readable feed. It is a plain HTML table, not RSS/Atom/JSON
 *      — there is nothing for this host's declarative `feed:` parser to read.
 *   2. `developer.ebay.com` itself is not reachable from a server-side
 *      client. Verified directly: `curl` (with a realistic browser
 *      User-Agent, Accept, Accept-Language and Referer headers) against
 *      that page, its `robots.txt`, and the api-status page all return
 *      `403 "Error Page | eBay"` — an edge/bot-detection block, not a
 *      missing resource. (The production API host, `api.ebay.com`, is a
 *      separate case — see `auth/client-credentials.ts` and `health/quota.ts`
 *      for confirmation that it serves real JSON once a request carries any
 *      Authorization header.)
 *
 * Declared rather than omitted, per this pack's convention (see e.g.
 * `campaignmonitor`, whose status host is "WAF-blocked to server-side
 * clients"): a host should be able to tell "we cannot know" from "nobody
 * looked". `severity: "informational"` so this can never worsen a roll-up —
 * an `unavailable` entry always reports `unknown`, which at any stronger
 * severity would pin the App there forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "eBay API status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "eBay's API-specific status page (developer.ebay.com/support/api-status) is a " +
      "plain HTML table with no RSS/JSON feed, and developer.ebay.com itself returns a 403 " +
      "edge block to server-side requests regardless of headers sent.",
  },
};

export default service;
