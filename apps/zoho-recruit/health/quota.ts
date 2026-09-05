/**
 * Zoho Recruit publishes no per-response quota or rate-limit header for this
 * app to read.
 *
 * Checked 2026-09-05: `https://www.zoho.com/recruit/developer-guide/apiv2/limits.html`
 * documents a real credit system (a rolling 24-hour window; a "Get Records"
 * call costs 3 credits, most others cost 1; edition-based daily allowances
 * from 5,000 to 1,000,000) plus separate concurrency/sub-concurrency limits —
 * but none of that is exposed as a *response header* the way Zoho CRM's
 * `X-API-CREDITS-REMAINING` is (see this pack's `zoho` app). A live
 * unauthenticated `GET /recruit/v2/Candidates` (and the same call with a
 * fake token) against `recruit.zoho.com` carries no `X-RateLimit-*` or
 * similarly named header at all. There is nothing to probe ahead of the
 * eventual 429 itself, so this is declared as a positive absence rather than
 * a silent gap — see `packages/apps/HEALTHCHECKS.md`.
 *
 * `severity: "informational"` is required here, not a style choice: an
 * `unavailable` check always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up — at any other severity this would pin the whole App's
 * verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API credit headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason:
      "Zoho Recruit documents a 24-hour rolling API credit system (per-call credit costs and " +
      "edition-based daily allowances) but exposes no X-RateLimit-* (or equivalent) response " +
      "header to probe headroom ahead of a 429 (verified live 2026-09-05).",
  },
};

export default quota;
