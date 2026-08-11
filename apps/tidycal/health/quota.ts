import type { HealthCheckDefinition } from "@w6w/types";

/**
 * TidyCal exposes no readable headroom of any kind, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` for the same reason as `health/service.ts`: an
 * `unavailable` entry always reports `unknown`, and `unknown` outranks `ok` in
 * the roll-up.
 *
 * ## Verified two ways on 2026-08-11
 *
 * 1. **Nothing on the wire.** A full header dump of
 *    `GET https://tidycal.com/api/me` (unauthenticated, and again with a
 *    syntactically plausible bearer) carried exactly: `date`, `content-type`,
 *    `server: cloudflare`, `cache-control: no-cache, private`, `cf-cache-status`,
 *    `set-cookie: __cf_bm=…` and `cf-ray`. There is **no** `X-RateLimit-Limit`,
 *    no `X-RateLimit-Remaining`, no `Retry-After` — no throttle headers at all,
 *    which for a Laravel API also implies the `throttle` middleware is not on
 *    the group, since it emits those headers ahead of authentication.
 * 2. **Nothing in the documentation.** TidyCal's OpenAPI document declares no
 *    `429` response on any of its 18 operations and its reference prose never
 *    uses the words "rate", "limit" or "quota" about requests.
 *
 * ## The limits that DO exist are commercial, not metered
 *
 * TidyCal's constraints are plan entitlements, and they surface as refusals at
 * the point of use rather than as a balance you can read ahead of time:
 *
 *  - **API access requires a paid plan** — stated in the reference's own
 *    authentication section. A free account cannot create a token at all.
 *  - **`POST /api/contacts` answers `402 Payment Required — Lifetime
 *    subscription required`**, a documented response on that one operation.
 *    Nothing exposes in advance whether the connected account qualifies; the
 *    only related signal is `lifetime_pro_at` on `GET /api/me`, which is a
 *    timestamp on the account, not a quota.
 *
 * Reporting either of those as "headroom" would be inventing a number. They are
 * documented on the actions that hit them instead.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "TidyCal publishes no quota or rate-limit signal. A full header dump of tidycal.com/api " +
      "responses carries no X-RateLimit-Limit, no X-RateLimit-Remaining and no Retry-After, and " +
      "the API reference declares no 429 response on any of its 18 operations. TidyCal's actual " +
      "constraints are plan entitlements enforced at the point of use — API access requires a " +
      "paid plan, and POST /api/contacts answers 402 without a lifetime subscription — neither " +
      "of which is readable as headroom in advance.",
  },
};

export default quota;
