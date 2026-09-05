import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is SimplyBook.me up?
 *
 * No usable machine-readable status feed was found. Checked live 2026-09-05:
 *
 *  - `status.simplybook.me` and `status.simplybook.it` both return `404`.
 *  - `simplybook.statuspage.io/api/v2/summary.json` `302`s to
 *    `https://www.statuspage.io` — the unclaimed-Statuspage decoy this pack's
 *    other apps have already documented (Apollo, Aweber, AgencyZoom, …): the
 *    page was never claimed by SimplyBook.me and carries no component data.
 *  - No `instatus.com` alias, `status.io` id, Better Stack page, or Atom/RSS
 *    feed for "SimplyBook" or "SimplyBook.me" was found either.
 *
 * This is a declared absence, not a gap — see `core/docs/build-a-w6w-app.md`
 * on health checks. `severity: "informational"` is load-bearing: an
 * `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in a roll-up, so at any other severity this would pin the App's verdict at
 * `unknown` forever. The derived `auth:login` check (from `../auth/login.ts`'s
 * `test` hook, `GET /admin/services`) is the automatable signal for "is
 * SimplyBook.me working" for anyone holding a live session.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "SimplyBook.me platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "SimplyBook.me publishes no status page: status.simplybook.me and " +
      "status.simplybook.it both 404, and simplybook.statuspage.io is the unclaimed-Statuspage " +
      "decoy (302 to statuspage.io's own marketing page) — both checked live 2026-09-05. The " +
      "auth:login check (GET /admin/services) is the automatable signal.",
  },
};

export default service;
