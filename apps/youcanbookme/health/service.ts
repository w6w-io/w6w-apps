import type { HealthCheckDefinition } from "@w6w/types";

/**
 * YouCanBookMe publishes no reachable status feed. Checked 2026-09-01:
 *  - `youcanbookme.statuspage.io` and `ycbm.statuspage.io` both 302 to
 *    `statuspage.io`'s own marketing page — the unclaimed-page decoy, not a
 *    real Atlassian Statuspage instance.
 *  - `status.youcanbookme.com` answers 404 on a generic app shell (and is
 *    the wrong domain anyway — the vendor's domain is `youcanbook.me`).
 *  - `youcanbook.freshstatus.io` answers 200 but with an empty, untitled
 *    Freshstatus "not found" shell.
 *  - `youcanbook.instatus.com` and `youcanbookme.instatus.com` are likewise
 *    unclaimed (one 307-redirects to instatus.com's own homepage, the other
 *    500s on `error`).
 *
 * Declared rather than omitted, per `HEALTHCHECKS.md`: an absent check
 * reports `unknown` forever, which is a worse answer than a stated absence.
 * `severity: "informational"` so a missing feed never worsens a roll-up
 * verdict on its own.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "YouCanBookMe platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "YouCanBookMe publishes no reachable status page: every Statuspage/Freshstatus/Instatus " +
      "path checked either redirects to the provider's own unclaimed-page decoy or answers an " +
      "empty not-found shell.",
  },
};

export default service;
