import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Basecamp rate-limits, and publishes no remaining count — so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 *
 * ## The limit is real, short, and self-clearing
 *
 * Basecamp's documented limit is **50 requests per 10-second window per token**,
 * and a `429` carries a `Retry-After` telling you how long to wait. That makes
 * it unlike the daily allowances elsewhere in this pack: a 429 here genuinely
 * does clear in moments, and `lib/client.ts` says so rather than implying the
 * caller is finished for the day.
 *
 * What it does not carry is a *remaining* count on a successful response —
 * there is no `RateLimit-Remaining` to read, so there is nothing to report
 * before the limit is hit. `Retry-After` only appears once you already have.
 *
 * A per-10-seconds window is also not a meaningful thing to report as health: by
 * the time a check ran and a human looked, it would have cleared several times
 * over. The useful signal is the client's error message, which names the window
 * and the wait.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Basecamp publishes no remaining-request count: a successful response carries no " +
      "RateLimit-* header, and Retry-After appears only on the 429 itself. The limit is 50 " +
      "requests per 10 seconds per token — a window short enough that a health check reporting " +
      "it would always be stale. The client surfaces the window and the Retry-After wait on the " +
      "error instead, which is the actionable form.",
  },
};

export default quota;
