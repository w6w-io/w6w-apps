/**
 * Is PDF.co up?
 *
 * ## Both candidate status hosts are unclaimed placeholders — checked 2026-08-24
 *
 * PDF.co links no status page from its own site or docs. Two conventional
 * guesses both resolve, and both turn out to be decoys:
 *
 * | Host                          | `/api/v2/summary.json`                          | Root (`-L`)                                            |
 * | ------------------------------ | ------------------------------------------------ | ------------------------------------------------------- |
 * | `status.pdf.co`                | `302` to `text/html`, title "Uptime Monitoring by Better Stack" (134,687 B, not JSON) | Follows to `https://betterstack.com/uptime` |
 * | `pdf-co.statuspage.io`         | (Atlassian Statuspage domain)                     | Follows to `https://www.atlassian.com/software/statuspage` |
 *
 * `status.pdf.co` is a CNAME onto Better Stack's uptime-monitoring product,
 * and the page itself redirects with `?unpublished-status-page=true` — an
 * account was created and pointed at this hostname but no page was ever
 * published behind it. `pdf-co.statuspage.io` is the equivalent Atlassian
 * Statuspage placeholder: the subdomain resolves, but nothing was ever
 * claimed on it, so the root page bounces straight to Atlassian's own
 * marketing site. Neither is the "fake vendor status page" pattern already
 * seen elsewhere in this pack (a claimed-but-generic ~127KB Statuspage HTML
 * shell) — these are *unclaimed* hosts on two different providers, and both
 * say so explicitly in their redirect target.
 *
 * Given neither host publishes anything machine-readable — or human-readable
 * — about PDF.co, this app declares the vendor-status check unavailable
 * rather than polling a redirect and guessing at meaning from it. Per
 * `packages/apps/HEALTHCHECKS.md`, that is a positive fact, not a gap, and it
 * is given `severity: "informational"` so its permanent `unknown` never
 * outranks a live, working credential (`health/quota.ts`, and the derived
 * `auth:api-key` check from `auth/api-key.ts`'s `test` hook) in the App's
 * overall verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "PDF.co platform status",
  description: "PDF.co publishes no status page — see `unavailable.reason`.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "PDF.co links no status page. The two conventional guesses, status.pdf.co and " +
      "pdf-co.statuspage.io, are both unclaimed placeholders (verified 2026-08-24): the former " +
      "redirects to Better Stack's own marketing page with ?unpublished-status-page=true, the " +
      "latter to Atlassian's Statuspage marketing page. Neither serves a summary.json or any " +
      "other machine-readable feed for this vendor. Credential liveness (auth:api-key, derived " +
      "from Auth.test) and the quota check are the only working health signals for this app.",
  },
};

export default service;
