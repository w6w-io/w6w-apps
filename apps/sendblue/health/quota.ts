import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Sendblue's own rate-limit documentation (`docs.sendblue.com/limits`,
 * verified 2026-08-25) describes every ceiling — new-contact caps, the
 * 10-messages/second per-line burst limit, the 150-consecutive-unanswered
 * follow-up cap, the separate Lookup API budget — as enforced purely by
 * refusal: a `429 "Too Many Requests"` with no stated remaining count. Live
 * responses from `api.sendblue.co` (checked against both an authenticated and
 * an unauthenticated request) carry no `X-RateLimit-*`, `RateLimit-*`, or any
 * other headroom header at all.
 *
 * There is nothing here for a `quota` check to read in advance —
 * `severity: "informational"` so this declared absence never pins the app's
 * overall verdict at `unknown`.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Sendblue enforces every documented ceiling (new-contact caps, the 10 msg/sec per-line " +
      "burst limit, the 150-consecutive-unanswered follow-up cap, the separate Lookup API " +
      "budget) by outright 429 refusal. Its own rate-limit documentation states no remaining-" +
      "count signal, and a live response carries no X-RateLimit-* or RateLimit-* header " +
      "(checked 2026-08-25) — there is no readable headroom to report.",
  },
};

export default quota;
