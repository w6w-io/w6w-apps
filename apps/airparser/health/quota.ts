/**
 * Declared absence: Airparser's Public API documentation names no
 * account-level credit balance, plan-limit, or rate-limit endpoint of any
 * kind, and no response observed on the wire (including the 401 bodies
 * captured in `lib/client.ts`) carries a rate-limit header. `document-get`
 * exposes a per-document `credits` figure — what one parse cost — but that is
 * not headroom, and there is no documented way to read the account's
 * remaining balance against it.
 *
 * `informational`, not the `degraded` default for `kind: "quota"` — an
 * `unavailable` check reports `unknown` forever, and `unknown` outranks `ok`
 * in the roll-up at any stronger severity, which would pin this App's health
 * at `unknown` for a dimension that simply cannot be read.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Airparser's Public API documents no account-level credit, plan-limit or rate-limit " +
      "endpoint, and no response observed carries a rate-limit header.",
  },
};

export default quota;
