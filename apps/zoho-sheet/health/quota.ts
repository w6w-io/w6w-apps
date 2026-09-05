/**
 * Zoho Sheet publishes no per-response quota or rate-limit header for this
 * app to read.
 *
 * Checked live 2026-09-05: `https://www.zoho.com/sheet/help/api/v2/` states
 * "As of now there is no daily or monthly usage limit for Zoho Sheet APIs,
 * but we have a limitation on per minute API calls to avoid overloading our
 * server. If that limit is exceeded, APIs on that document will not work for
 * the next 5 minutes. This limit differs from API to API and cannot be
 * increased" — and documents a specific calls-per-minute ceiling per
 * operation (20/30/60/120, depending on the method). None of that is exposed
 * as a *response header*: a live authenticated `POST /api/v2/workbooks` (and
 * the same call with a bad token) carries no `X-RateLimit-*` or similarly
 * named header at all. There is nothing to probe ahead of the 5-minute
 * lockout itself, so this is declared as a positive absence rather than a
 * silent gap — see `packages/apps/HEALTHCHECKS.md`.
 *
 * `severity: "informational"` is required here, not a style choice: an
 * `unavailable` check always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up — at any other severity this would pin the whole App's
 * verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Per-minute call headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason:
      "Zoho Sheet documents a per-method, per-minute call ceiling with a 5-minute lockout once " +
      "exceeded, but exposes no X-RateLimit-* (or equivalent) response header to probe headroom " +
      "ahead of that lockout (verified live 2026-09-05).",
  },
};

export default quota;
