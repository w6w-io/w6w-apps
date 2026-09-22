/**
 * Zoho Inventory publishes no per-response quota or rate-limit header for this
 * app to read.
 *
 * Checked 2026-09-22: the only thing Zoho exposes for Inventory is what the
 * API itself answers once a limit is hit — there is no `X-RateLimit-*` (or
 * similarly named) response header on the calls this app makes. A live
 * unauthenticated `GET https://www.zohoapis.com/inventory/v1/organizations`
 * (and the same call with a syntactically valid but dead token) carries no
 * such header at all, and the vendor's error page documents codes for the
 * failures rather than a headroom surface. There is nothing to probe ahead of
 * the limit itself, so this is declared as a positive absence rather than a
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
  title: "Plan headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason:
      "Zoho Inventory documents request limits and the error bodies returned once they are hit, " +
      "but exposes no X-RateLimit-* (or equivalent) response header to probe headroom ahead of a " +
      "429 (verified live 2026-09-22).",
  },
};

export default quota;
