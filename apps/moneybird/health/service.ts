import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Moneybird up?
 *
 * Checked live on 2026-09-06, three ways:
 *
 *  - `status.moneybird.com` resolves and answers `200`, but it is a
 *    Dutch-language, custom-branded page with no `/api/v2/summary.json` (or
 *    any other machine-readable) endpoint — a `404` there, confirmed by
 *    content, not just status code.
 *  - `moneybird.statuspage.io/api/v2/summary.json` answers a `302` straight
 *    to `https://www.statuspage.io`, and following it lands on the exact
 *    127,717-byte unclaimed-Statuspage marketing page this pack's other apps
 *    have already documented as a decoy (Apollo, AgencyZoom, Aweber, …) — it
 *    was never claimed by Moneybird and carries no component data for it.
 *  - No `instatus.com` alias or Better Stack page for "Moneybird" was found
 *    either.
 *
 * This is a declared absence, not a gap — see `core/docs/build-a-w6w-app.md`
 * on health checks. `severity: "informational"` is load-bearing: an
 * `unavailable` entry always reports `unknown`, and `unknown` outranks `ok` in
 * a roll-up, so at any other severity this would pin the App's verdict at
 * `unknown` forever. The derived `auth:personal-token` / `auth:oauth2` checks
 * (from each `auth/*.ts`'s `test` hook, `GET /administrations.json`) are the
 * automatable signal for "is Moneybird working" for anyone holding a live
 * credential.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Moneybird platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Moneybird publishes no machine-readable status page: status.moneybird.com is a " +
      "custom Dutch-language page with no JSON endpoint (404 on /api/v2/summary.json), and " +
      "moneybird.statuspage.io is the unclaimed-Statuspage decoy (302 to statuspage.io's own " +
      "marketing page) — both checked live 2026-09-06. The derived auth:* checks " +
      "(GET /administrations.json) are the automatable signal.",
  },
};

export default service;
