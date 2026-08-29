import type { HealthCheckDefinition } from "@w6w/types";

/**
 * CloudConvert publishes no readable *request-rate* headroom, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other severity a
 * declared absence would pin the app's verdict at `unknown` forever.
 *
 * ## Why this is separate from `health/quota.ts`
 *
 * CloudConvert meters two independent things and only one is readable without a side
 * effect. Conversion-credit balance *is* readable (a plain `GET /v2/users/me`) and is
 * covered by `quota`. Request-rate headroom is different: per CloudConvert's own docs,
 * "some endpoints enforce dynamic rate limiting... currently rate limited: Creating
 * tasks, Creating jobs" — and *only* those two write endpoints answer with
 * `X-RateLimit-Limit` / `X-RateLimit-Remaining`. Reading it would mean spending a create
 * call, which is not a side-effect-free probe.
 *
 * ## Verified two ways on 2026-08-29
 *
 * 1. **Nothing on the wire for reads.** `GET /v2/jobs` and `GET /v2/operations` carry
 *    no `X-RateLimit-*` header of any kind — measured live, unauthenticated and
 *    authenticated.
 * 2. **The documentation names exactly which endpoints carry the header, and reads are
 *    not among them.** CloudConvert's own example response — `X-RateLimit-Limit: 1000`,
 *    `X-RateLimit-Remaining: 0`, `Retry-After: 60` on a `429` — is shown only under
 *    "Creating tasks" and "Creating jobs".
 */
const requestRate: HealthCheckDefinition = {
  key: "request-rate",
  title: "Job/task creation rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "CloudConvert rate-limits only job and task creation, and the X-RateLimit-Limit / " +
      "X-RateLimit-Remaining headers appear ONLY on those write responses — a plain read " +
      "(GET /v2/jobs, GET /v2/operations) carries neither header, measured live 2026-08-29. " +
      "Reading this headroom would require spending a create call, which is not a " +
      "side-effect-free probe. Conversion-credit balance, which IS readable without a side " +
      "effect, is reported by the `quota` check instead.",
  },
};

export default requestRate;
