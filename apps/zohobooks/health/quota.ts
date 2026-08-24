/**
 * Zoho Books publishes no per-response quota or rate-limit header for this
 * app to read.
 *
 * Checked 2026-08-24: `https://www.zoho.com/books/api/v3/introduction/`
 * documents real limits (100 requests/minute per organization; a daily cap
 * from 1,000 to 10,000 depending on plan) and the exact `code`/`message`
 * bodies returned once they're exceeded (`429 {"code":45,...}` for the daily
 * cap, `429 {"code":44,...}` for the per-minute cap, `429 {"code":1070,...}`
 * for the concurrent-call limit) — but none of that is exposed as a *response
 * header* the way Zoho CRM's `X-API-CREDITS-REMAINING` is. A live
 * unauthenticated `GET /organizations` (and the same call with a bad token)
 * carries no `X-RateLimit-*` or similarly named header at all. There is
 * nothing to probe ahead of the 429 itself, so this is declared as a positive
 * absence rather than a silent gap — see `packages/apps/HEALTHCHECKS.md`.
 *
 * `severity: "informational"` is required here, not a style choice: an
 * `unavailable` check always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up — at any other severity this would pin the whole App's
 * verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason:
      "Zoho Books documents per-minute/per-day/per-organization request limits, but exposes no " +
      "X-RateLimit-* (or equivalent) response header to probe headroom ahead of a 429 " +
      "(verified live 2026-08-24).",
  },
};

export default quota;
