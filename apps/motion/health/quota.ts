import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Motion publishes no readable rate-limit headroom, so this declares
 * `unavailable` with a reason rather than pretending to probe one.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity this declared absence would pin the app's verdict at `unknown`
 * forever.
 *
 * ## Verified two ways on 2026-08-11
 *
 * 1. **Nothing on the wire.** Live responses from `api.usemotion.com` carried
 *    `date`, `content-type`, `content-length`, `server`, `etag`,
 *    `cf-cache-status` and `cf-ray` — and no `X-RateLimit-Limit`, no
 *    `X-RateLimit-Remaining`, no `X-RateLimit-Reset` and no `Retry-After`, on
 *    401s, 404s and 400s alike. Twenty consecutive unauthenticated requests
 *    inside one minute produced twenty 401s and no 429, which places the limiter
 *    *after* the auth guard: it meters an API key, and an unsigned probe
 *    therefore cannot read anyone's budget even indirectly.
 * 2. **Nothing in the documentation.** Motion's "Rate limits" page states three
 *    fixed tier ceilings and nothing else — no consumption endpoint, no headers,
 *    no reset semantics. The whole page is 229 bytes of prose.
 *
 * ## The ceilings that DO exist
 *
 *  - **12 requests/minute** — the base tier, for an individual.
 *  - **up to 120 requests/minute** — available to teams on request.
 *  - higher, by arrangement, on the enterprise tier.
 *
 * 12/minute is low enough to matter to workflow design rather than only to
 * monitoring: a loop that pages through tasks with `meta.nextCursor` will reach
 * it inside a minute on an individual plan. `lib/client.ts` quotes the ceiling
 * on a 429 so the number arrives with the error rather than having to be looked
 * up.
 *
 * A probe cannot substitute for this. Discovering the remaining budget by
 * spending it — issuing requests until one 429s — costs the user the very quota
 * being measured, on a plan where a single check would be 8% of a minute's
 * allowance.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Motion exposes no remaining request count. Live responses from api.usemotion.com carry no " +
      "X-RateLimit-* header, no Retry-After and no consumption endpoint, and the vendor's rate-" +
      "limit documentation states only fixed tier ceilings: 12 requests/minute for an " +
      "individual, up to 120/minute for a team on request, higher on enterprise. The limiter " +
      "runs after the auth guard (20 unauthenticated requests in one minute produced no 429), so " +
      "an unsigned probe cannot read a key's budget, and a signed one would have to spend the " +
      "quota it is measuring.",
  },
};

export default quota;
