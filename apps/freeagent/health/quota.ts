/**
 * Do we have quota left? — FreeAgent publishes fixed rate-limit CEILINGS
 * (`dev.freeagent.com/docs/introduction`: 120 user requests/minute, 3600
 * user requests/hour, 15 token refreshes/minute), but confirmed no matching
 * remaining/consumed headroom header on ANY response — success or 429. The
 * only rate-limit signal an actual response carries is `Retry-After` on a
 * 429 itself, which is a reactive "back off now" instruction, not a
 * forward-looking headroom reading this check could poll cheaply.
 *
 * `severity: "informational"` — a declared absence always reports `unknown`,
 * which outranks `ok` in the roll-up, so at any severity but `informational`
 * this would pin the app's health at `unknown` forever (see
 * `packages/apps/HEALTHCHECKS.md`).
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "FreeAgent documents fixed per-minute/per-hour rate-limit ceilings but returns no remaining-quota header on any response — the only signal is Retry-After after a 429 has already happened.",
  },
};

export default quota;
