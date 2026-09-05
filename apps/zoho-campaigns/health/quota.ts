/**
 * Zoho Campaigns publishes no per-response quota or rate-limit header for
 * this app to read.
 *
 * Checked 2026-09-05: `https://www.zoho.com/campaigns/help/developers/` and
 * its per-endpoint pages document real, PER-ENDPOINT rate limits (e.g. 500
 * calls/5 minutes for most reads, 100 calls/5 minutes for custom-field
 * creation, 2,000 calls/minute for bulk contact add, three stacked windows —
 * 500/minute, 12,500/hour, 75,000/day — for Subscribe) each with its own
 * lock-out period once exceeded, but none of that is exposed as a *response
 * header*. A live unauthenticated `GET /api/v1.1/getmailinglists` (and the
 * same call with a bad token) carries no `X-RateLimit-*` or similarly named
 * header at all — checked live 2026-09-05 against `campaigns.zoho.com`. Since
 * the limit is per-endpoint rather than per-account, there is also no single
 * number a quota check could report even if a header existed. There is
 * nothing to probe ahead of the eventual rate-limit rejection, so this is
 * declared as a positive absence rather than a silent gap — see
 * `packages/apps/HEALTHCHECKS.md`.
 *
 * `severity: "informational"` is required here, not a style choice: an
 * `unavailable` check always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up — at any other severity this would pin the whole App's
 * verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason:
      "Zoho Campaigns documents real per-endpoint rate limits (calls per minute/5-minutes/hour/day, " +
      "each with its own lock-out period), but exposes no X-RateLimit-* (or equivalent) response " +
      "header to probe headroom ahead of a rejection (verified live 2026-09-05).",
  },
};

export default quota;
