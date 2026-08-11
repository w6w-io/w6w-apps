import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Formstack meters by the **day**, and publishes no way to read what is left —
 * so this declares `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 *
 * ## What the limit actually is
 *
 * The vendor's words: "To prevent abuse, the Formstack V2025 API implements
 * **daily rate limiting per access token**. The specific limits vary based on
 * your account plan type. When you exceed your daily quota, you'll receive a
 * `429 Too Many Requests` error."
 *
 * Two consequences worth stating, because they change what a caller should do:
 *
 *  - The allowance is **per token**, so two connections using two tokens do not
 *    share one — but every workflow using the *same* token does.
 *  - The window is a **day**. A 429 here does not mean "wait a moment"; it means
 *    this token is finished until the window rolls. `lib/client.ts` says exactly
 *    that in the error rather than letting a caller retry into the same wall.
 *
 * ## Verified on 2026-08-11
 *
 * A live response from `www.formstack.com/api/v2025` carries no `RateLimit-*`,
 * no `X-RateLimit-*` and no `Retry-After`, and the documentation describes the
 * 429 without naming a header. The plan-specific allowance is a pricing fact
 * rather than an API-readable one, so there is nothing to report before it runs
 * out.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Formstack publishes no readable headroom: a live V2025 response carries no RateLimit-*, " +
      "X-RateLimit-* or Retry-After header. The limit is real but daily and per access token, " +
      "with the allowance varying by plan — so it is a pricing fact rather than an API-readable " +
      "one, and the only signal is the 429 itself. Because the window is a day, a 429 means this " +
      "token is finished until it rolls, not that a retry would help.",
  },
};

export default quota;
