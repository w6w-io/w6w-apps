import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Wufoo has real, documented limits — and publishes no way to read how much of
 * either is left. So this declares `unavailable` with a reason rather than
 * pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 *
 * ## The two limits, both real
 *
 *  - **Daily API requests, per plan.** The vendor's words: "we restrict API
 *    usage per key, per day. Your API usage is dependent on your plan." The
 *    allowance is a pricing-page fact, not an API-readable number, and nothing
 *    in a response says how much of today's is left.
 *  - **50 entry submissions per Wufoo user per 5-minute sliding window.**
 *    Exceeding it returns `{"Text": "Slow Down", "HTTPCode": 429}` — a refusal,
 *    delivered only once you have already hit it. `actions/entry-create.ts`
 *    documents this at the call site.
 *
 * ## Verified on 2026-08-11
 *
 * A live response from `*.wufoo.com/api/v3/` carries no `RateLimit-*`, no
 * `X-RateLimit-*` and no `Retry-After`, and the vendor's API documentation
 * describes the 429 body but no header. Both limits are enforced by rejection,
 * which is the same "revealed only by refusing" shape a quota check cannot read
 * in advance.
 *
 * The one thing that *would* be readable — the daily allowance for the plan —
 * lives on a pricing page rather than in the API, and reporting a plan tier as
 * if it were remaining headroom would be worse than saying plainly that there is
 * none to read.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Wufoo publishes no readable headroom: a live API response carries no RateLimit-*, " +
      "X-RateLimit-* or Retry-After header. It does enforce two real limits — a per-key daily " +
      "request allowance that varies by plan, and 50 entry submissions per user per 5-minute " +
      'window, which returns `{"Text":"Slow Down","HTTPCode":429}` once exceeded. Both are ' +
      "enforced by refusal, so neither can be read before it runs out.",
  },
};

export default quota;
