import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Instapaper up?
 *
 * Instapaper publishes no independent, machine-readable status page. Checked
 * live on 2026-09-05:
 *
 *  - `status.instapaper.com` does not resolve (DNS `NXDOMAIN`) — there is no
 *    host to even ask.
 *  - `instapaper.statuspage.io/api/v2/summary.json` answers a `302` to
 *    `https://www.statuspage.io` — the same unclaimed-Statuspage decoy this
 *    pack's other apps have already documented (Apollo, Aweber, AgencyZoom,
 *    …): the page was never claimed by Instapaper and carries no component
 *    data.
 *
 * This is a declared absence, not a gap — see `core/docs/build-a-w6w-app.md`
 * on health checks. `severity: "informational"` is load-bearing: an
 * `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in a roll-up, so at any other severity this would pin the App's verdict at
 * `unknown` forever. The derived `auth:xauth` check (from
 * `../auth/xauth.ts`'s `test` hook, `POST /api/1/account/verify_credentials`)
 * is the automatable signal for "is Instapaper working" for anyone holding a
 * live connection.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Instapaper platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Instapaper publishes no status page: status.instapaper.com does not resolve, and " +
      "instapaper.statuspage.io is the unclaimed-Statuspage decoy (302 to statuspage.io's own " +
      "marketing page) — both checked live 2026-09-05. The auth:xauth check " +
      "(POST /api/1/account/verify_credentials) is the automatable signal.",
  },
};

export default service;
