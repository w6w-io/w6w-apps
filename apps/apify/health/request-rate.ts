import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Apify publishes no readable *request-rate* headroom, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 *
 * ## Why this is separate from `health/quota.ts`
 *
 * Apify meters two independent things and only one is readable in advance.
 * Plan consumption *is* readable and is probed by the `quota` check. Request
 * rate is not, and collapsing the two would let a healthy plan-headroom reading
 * imply something about rate headroom that Apify never told us.
 *
 * ## Verified two ways on 2026-08-11
 *
 * 1. **Nothing on the wire.** Live responses from `api.apify.com` carried
 *    `date`, `content-type`, `content-length`, `cache-control`, `pragma`,
 *    `expires`, `access-control-allow-origin`, `access-control-allow-headers`,
 *    `access-control-allow-methods`, `access-control-expose-headers`,
 *    `referrer-policy`, `x-robots-tag`, `x-ratelimit-limit`, `etag` and `vary`
 *    — plus the `x-apify-pagination-*` set on list endpoints. There is
 *    `x-ratelimit-limit` (90 on `/v2/users/me`, 60 on `/v2/store`) and **no**
 *    `X-RateLimit-Remaining` and **no** `X-RateLimit-Reset` on any of them.
 * 2. **Nothing in the documentation.** Apify's rate-limiting section documents
 *    the ceilings as fixed numbers and says the only signal is the `429`
 *    itself, which arrives after you have already been refused.
 *
 * ## The ceilings that DO exist
 *
 *  - **250,000 requests/minute globally** — per user when authenticated, per IP
 *    otherwise.
 *  - **60 requests/second per resource** by default, where "resource" means a
 *    single Actor, run, dataset or store — not the account.
 *  - **200/second per resource** for key-value-store record get/put/delete.
 *  - **400/second per resource** for Run Actor, the task-run endpoints,
 *    metamorph, dataset push, and request-queue request CRUD.
 *
 * All are enforced by refusal (`429 rate-limit-exceeded`), and the per-resource
 * ceiling is reported by `X-RateLimit-Limit` only as a *ceiling* — the count
 * against it is never exposed. Apify's documented remedy is exponential
 * backoff, which is a client behaviour, not something a health check can read.
 */
const requestRate: HealthCheckDefinition = {
  key: "request-rate",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Apify exposes no remaining request count: a live API response carries X-RateLimit-Limit " +
      "(the ceiling) but no X-RateLimit-Remaining and no reset header, and the rate-limiting " +
      "documentation states the only signal is the 429 itself. The ceilings are fixed — 250,000 " +
      "requests/minute globally and 60/second per resource (200/second for key-value-store " +
      "record CRUD, 400/second for the run and dataset-push endpoints) — and the documented " +
      "remedy is client-side exponential backoff. Plan consumption, which IS readable, is " +
      "reported by the `quota` check instead.",
  },
};

export default requestRate;
