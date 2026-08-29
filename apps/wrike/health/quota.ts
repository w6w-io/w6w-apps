/**
 * Wrike exposes no readable request-rate headroom, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` — same reasoning as `health/service.ts`: an
 * `unavailable` entry always reports `unknown`, which would otherwise pin the
 * App's verdict there forever.
 *
 * ## Verified two ways on 2026-08-29
 *
 *  1. **Nothing on the wire.** A live 401 response from
 *     `www.wrike.com/api/v4/version` carried only `date`, `content-type`,
 *     `content-length`, `server`, `wrike-response-id`, `cache-control`,
 *     `x-xss-protection`, `x-content-type-options`, `strict-transport-security`,
 *     `accept-ch`, `cf-cache-status` and `cf-ray` — no `X-RateLimit-*` header
 *     of any kind, on either a 401 or (per the documentation below) a success.
 *  2. **Nothing in the documentation.** `docs/errors-api-reference-v4` states
 *     the ceiling as a fixed number — "429 too_many_requests: IP or access
 *     token exceeded limit: 400 requests per minute" — and gives no mechanism
 *     for reading remaining headroom before that point; the only signal is
 *     the 429 itself, after the fact.
 *
 * ## What DOES exist, and was rejected as a substitute
 *
 * `GET /account` returns `subscription.userLimit` — a *seat* ceiling, not a
 * request-rate one, and explicitly gated: the vendor's own schema says
 * `userLimit` is "available only to account admins", with no paired "current
 * usage" figure at all. A check that needs a scope or role the connecting
 * user may legitimately lack would report a working, non-admin Connection as
 * broken — the same trap this pack's `build-a-w6w-app.md` warns about for any
 * probe. `health/account.ts` reads the one admin-independent, genuinely live
 * signal that endpoint offers instead (`subscription.suspended`).
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Wrike exposes no remaining request count: a live API response carries no X-RateLimit-* " +
      "header of any kind, and errors-api-reference-v4 documents only a fixed ceiling (400 " +
      "requests/minute per IP or access token) with the 429 itself as the sole signal. The one " +
      "usage figure the API does expose (GET /account's subscription.userLimit) is a seat count, " +
      "not a request-rate one, and is documented as admin-only with no paired current-usage field " +
      "— see the source comment for why that disqualifies it as a probe rather than just being " +
      "unused.",
  },
};

export default quota;
