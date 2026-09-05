import type { HealthCheckDefinition } from "@w6w/types";

/**
 * OneSignal publishes no readable rate-limit headroom, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity a declared absence would pin every verdict at `unknown`
 * forever.
 *
 * ## Verified two ways on 2026-09-05
 *
 * 1. **Nothing on the wire.** A live 401 from `api.onesignal.com` (missing
 *    and bogus `Authorization` both) carried `date`, `content-type`,
 *    `content-length`, `server`, `via`, `alt-svc`, `cf-cache-status`,
 *    `set-cookie`, `strict-transport-security`, `cf-ray` — no
 *    `X-RateLimit-*` header of any kind, and no `Retry-After` (which only
 *    appears on an actual `429`).
 * 2. **Nothing in the documentation.** `/reference/rate-limits` states the
 *    ceilings as fixed numbers per plan tier (e.g. 150 or 6,000 requests/sec
 *    per app for Create/Cancel message) and says explicitly the only signal
 *    is the `429` response itself: `{"errors": ["API rate limit exceeded."]}`
 *    plus a `Retry-After` header giving the wait, never a remaining count.
 *
 * ## Not the same thing as the application message limit
 *
 * OneSignal separately disables an app that delivers more than 10× its
 * subscribed-Subscription count in any rolling 15-minute window. That is a
 * real, documented ceiling — but it is evaluated internally against message
 * *delivery* volume, not request volume, and nothing in the REST API exposes
 * how much of it has been consumed at a given moment. `GET /apps/{app_id}`
 * does return `players`/`messageable_players` (the base of that formula), but
 * a subscriber count is not a spend reading, and that endpoint is avoided
 * here anyway — see `actions/view-app.ts` for why.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "OneSignal exposes no remaining-request count: a live API response (success or 401) " +
      "carries no X-RateLimit-* header of any kind, and /reference/rate-limits states the " +
      "only signal is the 429 response itself, with Retry-After giving the wait. Ceilings are " +
      "fixed per plan tier (e.g. 150 or 6,000 requests/sec/app for Create/Cancel message). The " +
      "separate application message-limit (10x subscribed Subscriptions per rolling 15 " +
      "minutes) is also unreadable in advance — it disables the app internally rather than " +
      "exposing a queryable balance.",
  },
};

export default quota;
