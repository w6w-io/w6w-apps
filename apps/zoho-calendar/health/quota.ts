/**
 * Zoho Calendar publishes no per-response quota or rate-limit header for this app to read.
 *
 * Checked live 2026-09-05: `GET /api/v1/calendars`, both unauthenticated and with a dead OAuth
 * token, carries no `X-RateLimit-*`, `RateLimit-*`, `Retry-After` or similarly named header on
 * either response — and Zoho's own documentation (introduction.html, response-codes.html) never
 * mentions a rate-limit surface for this API at all, unlike CRM's `X-API-CREDITS-REMAINING`. There
 * is nothing to probe ahead of a throttling response, so this is declared as a positive absence
 * rather than a silent gap — see `packages/apps/HEALTHCHECKS.md`.
 *
 * `severity: "informational"` is required here, not a style choice: an `unavailable` check always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up — at any other severity this would
 * pin the whole App's verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason:
      "Zoho Calendar exposes no X-RateLimit-* (or equivalent) response header, and its own docs " +
      "document no rate-limit surface at all for this API (verified live 2026-09-05).",
  },
};

export default quota;
