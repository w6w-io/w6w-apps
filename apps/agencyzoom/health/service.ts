import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is AgencyZoom up?
 *
 * AgencyZoom publishes no independent status page. Checked live on
 * 2026-09-05:
 *
 *  - `status.agencyzoom.com` does not resolve (DNS `NXDOMAIN`) — there is no
 *    host to even ask.
 *  - `agencyzoom.statuspage.io/api/v2/summary.json` answers a `302` to
 *    `https://www.statuspage.io` — the unclaimed-Statuspage decoy this pack's
 *    other apps have already documented (Apollo, Aweber, …): the page was
 *    never claimed by AgencyZoom and carries no component data.
 *  - No `instatus.com` alias, `status.io` id, or Better Stack page for
 *    "AgencyZoom" was found either.
 *
 * This is a declared absence, not a gap — see `core/docs/build-a-w6w-app.md`
 * on health checks. `severity: "informational"` is load-bearing: an
 * `unavailable` entry always reports `unknown`, and `unknown` outranks `ok` in
 * a roll-up, so at any other severity this would pin the App's verdict at
 * `unknown` forever. The derived `auth:login` check (from `../auth/login.ts`'s
 * `test` hook, `GET /v1/api/employees`) is the automatable signal for "is
 * AgencyZoom working" for anyone holding a live session.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "AgencyZoom platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "AgencyZoom publishes no status page: status.agencyzoom.com does not resolve, and " +
      "agencyzoom.statuspage.io is the unclaimed-Statuspage decoy (302 to statuspage.io's own " +
      "marketing page) — both checked live 2026-09-05. The auth:login check " +
      "(GET /v1/api/employees) is the automatable signal.",
  },
};

export default service;
