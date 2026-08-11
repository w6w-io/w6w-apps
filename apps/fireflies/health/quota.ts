/**
 * Do we have quota left? — not knowable, declared as a positive fact.
 *
 * Fireflies meters hard (docs: `fundamentals/limits`) — 50 requests/day on
 * Free, 500/day on Pro, 60/min on Business and Enterprise, plus per-mutation
 * caps (`addToLiveMeeting` 3 per 20 min, `shareMeeting` 10/hour,
 * `deleteTranscript` 10/min, `updateMeetingState` and `createLiveActionItem`
 * 10/hour). But none of it is observable before you hit it:
 *
 *  - **No rate-limit headers.** A live response carries only `date`,
 *    `content-type`, `content-length`, `vary`, `access-control-allow-origin`,
 *    `strict-transport-security`, `cf-cache-status`, `server` and `cf-ray`
 *    (measured 2026-08-11). There is no `X-RateLimit-*` family to read, which
 *    is what every other quota check in this pack relies on.
 *  - **No usage endpoint.** Nothing in the schema reports remaining calls.
 *    `user { minutes_consumed }` counts recorded MEETING minutes, a billing
 *    quantity for the notetaker — not API allowance — and reporting it as
 *    headroom would be a confident lie.
 *  - **Headroom only exists retroactively**, as a `too_many_requests` error
 *    with `extensions.metadata.retryAfter` (an epoch-millisecond timestamp)
 *    once the limit has already been passed (docs: `miscellaneous/error-codes`).
 *
 * And a probe would be self-defeating: the only way to observe the counter is
 * to spend it. On the Free plan's 50/day, a five-minute quota check would
 * consume 288 requests a day — six times the entire allowance — so the check
 * would cause the outage it claims to warn about. `health/api.ts` is
 * deliberately unsigned for the same reason.
 *
 * `severity: "informational"` is required, not stylistic: an `unavailable`
 * entry always reports `unknown`, and `unknown` outranks `ok` in the roll-up,
 * so at any other severity this would pin the app's verdict at `unknown`
 * permanently.
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
      "Fireflies exposes no rate-limit headers and no usage endpoint; the per-plan allowance " +
      "(50/day Free, 500/day Pro, 60/min Business+) only becomes observable as a " +
      "`too_many_requests` error carrying `extensions.metadata.retryAfter` after it has been " +
      "exceeded. A probe would also spend the very allowance it measures — 288 calls a day at a " +
      "5-minute interval, against a 50/day Free plan.",
  },
};

export default quota;
