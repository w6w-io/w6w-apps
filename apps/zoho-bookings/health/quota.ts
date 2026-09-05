/**
 * Zoho Bookings publishes no per-response quota or rate-limit header for
 * this app to read.
 *
 * Checked 2026-09-05 against the archived
 * `https://www.zoho.com/bookings/help/api/v1/generate-accesstoken.html`
 * (fetched via the Wayback Machine — see `lib/client.ts` module docs): it
 * documents real per-day limits by plan (Free 250/user/day, Basic
 * 1000/user/day, Premium and Zoho One 3000/user/day, "excluding the
 * authorization requests") but exposes no `X-RateLimit-*` (or equivalent)
 * response header to probe headroom ahead of the eventual `429`. A live
 * unauthenticated `GET /bookings/v1/json/workspaces` (and the same call with
 * a bad token) carries no rate-limit header of any kind — checked live
 * 2026-09-05 against `www.zohoapis.com`. There is nothing to probe ahead of
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
    reason: "Zoho Bookings documents a per-user/per-day request limit by plan, but exposes no " +
      "X-RateLimit-* (or equivalent) response header to probe headroom ahead of a 429 " +
      "(verified live 2026-09-05).",
  },
};

export default quota;
