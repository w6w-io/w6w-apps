import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Twitch publishes no vendor statement about the health of the Helix API, so
 * this declares `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up — so at any
 * other severity a declared absence would pin this app's verdict at `unknown`
 * forever.
 *
 * ## Why this is separate from `health/service.ts`
 *
 * Twitch does have a real, machine-readable Statuspage, and the `service` check
 * reads it. But its six components — measured 2026-08-11 from
 * `status.twitch.com/api/v2/summary.json` — are `Login`, `Web`, `Chat`,
 * `Video (Watching)`, `Video (Broadcasting)` and `Purchases`. **None of them is
 * the API.** So "all systems operational" on that page is a statement about the
 * consumer product, and reading it as a statement about `api.twitch.tv` would
 * be inventing a signal Twitch never published.
 *
 * Collapsing the two would make the `service` check quietly stronger than the
 * evidence behind it. Keeping them apart is what lets a green `service` and an
 * unknown `api-status` coexist honestly, and it is what the `api` check — which
 * measures reachability from here, a different question again — sits beside.
 *
 * ## Verified two ways on 2026-08-11
 *
 * 1. **Nothing on the page.** `GET https://status.twitch.com/api/v2/summary.json`
 *    returned six components (`yz28x40y5mq2` Login, `j6dkmwm0h3k2` Web,
 *    `4qrh4gj6bgt2` Chat, `wkdq12ctv52c` Video (Watching), `6pr6psm3s003` Video
 *    (Broadcasting), `ys9m23jjzpg0` Purchases), no component groups, and no API
 *    component under any spelling.
 * 2. **Nothing beside it.** `GET https://status.twitch.com/api/v2/components.json`
 *    (1,944 bytes) returns the same six, so the summary is not an abridgement
 *    hiding a longer list. The incident history is equally quiet: 50 incidents
 *    in `incidents.json`, the most recent resolved on 2026-03-31 — over four
 *    months before this was written — so even the log offers no API signal.
 *
 * ## What answers the question instead
 *
 * `health/api.ts` probes `api.twitch.tv` unauthenticated and reads a JSON 401 as
 * a pass. That is reachability measured from the host running the check, not
 * Twitch's own statement, and the two are not substitutes: a probe that fails
 * cannot tell you whether Twitch is down or your egress is. Both are reported,
 * separately, on purpose.
 */
const apiStatus: HealthCheckDefinition = {
  key: "api-status",
  title: "Vendor status for the Helix API",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Twitch's status page publishes no component for the Helix API. status.twitch.com carries " +
      "exactly six components — Login, Web, Chat, Video (Watching), Video (Broadcasting) and " +
      "Purchases — in both summary.json and components.json, so a green page is a statement " +
      "about the consumer product and not about api.twitch.tv. The `service` check reports what " +
      "the page does cover; the `api` check measures whether Helix is reachable and answering " +
      "from here, which is a different question and not a vendor statement.",
  },
};

export default apiStatus;
