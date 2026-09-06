import type { HealthCheckDefinition } from "@w6w/types";

/**
 * How much of this account's Vapi usage ceiling is left?
 *
 * There is nothing to read. The OpenAPI document (fetched live 2026-09-06)
 * declares no `/org`, `/account`, `/billing` or `/usage` path of any kind —
 * nothing that would return a spend figure, a concurrent-call limit, or a
 * plan ceiling. A live 401 probe against `GET /assistant` on the same day
 * carried no `X-RateLimit-*`, `RateLimit-*` or `Retry-After` header, and no
 * path in the document declares a `429` response for this app's surface.
 *
 * `severity: "informational"` — an `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in a roll-up, so at any other
 * severity this would pin the App's overall verdict at `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Usage headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Vapi's OpenAPI document has no /org, /account, /billing or /usage endpoint, and a live " +
      "401 probe (2026-09-06) carried no rate-limit header of any kind; concurrent-call and " +
      "monthly-spend ceilings are configured and viewed only in the Vapi dashboard.",
  },
};

export default quota;
