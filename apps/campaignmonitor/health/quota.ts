import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Campaign Monitor exposes no readable headroom, so this declares `unavailable`
 * with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 *
 * ## The three things that look like quota, and why none of them is
 *
 * **1. The rate-limit headers are real but out of reach.** The reference
 * documents `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset`
 * — a complete set, unlike most vendors — but scopes them precisely: "**All
 * /transactional endpoints** are subject to API rate limiting. As part of every
 * response, the HTTP headers will show your current rate limit status." Nothing
 * outside `/transactional` is rate limited and nothing outside `/transactional`
 * carries the headers. Reading them therefore requires issuing a transactional
 * request, and every one of those either *sends email* (`/smartEmail/{id}/send`,
 * `/classicEmail/send`) or is refused outright on accounts without the feature
 * (code 980, "Transactional email is not available in your account. You need to
 * be on an active monthly plan to send transactional email"). A health check
 * that sends mail is not a health check, and one that reports 980 as exhausted
 * headroom would report every non-transactional account as broken.
 *
 * **2. `GET /billingdetails.json` returns a balance, not a ceiling.** Its entire
 * documented response is `{"Credits": 3021}`. Three problems: it is an
 * account-level, agency-facing read that answers `403 {"Code":403,"Message":"Not
 * allowed for a Non-agency Customer."}` to a direct customer; credits are
 * irrelevant on a monthly-billed plan, where zero credits is the *normal* state
 * of a perfectly healthy account; and a count with no ceiling cannot be turned
 * into a headroom fraction without inventing the denominator. Reporting it as
 * quota would flag healthy monthly accounts as exhausted — the exact failure the
 * pack's probe-selection rule exists to prevent. The number is still available
 * on demand as the `billing-details-get` Action, where a human can read it in
 * context.
 *
 * **3. The per-client `Credits` in the client-details response** has all the
 * same problems, plus it sits in the one response that also carries a live
 * `ApiKey` (see `lib/client.ts#stripSecrets`).
 *
 * ## The limits that DO exist, and are all fixed rather than metered
 *
 * These are documented as constants, so they are a client-side concern, not
 * something a check can read:
 *
 *  - **25 recipients** across `To`, `CC` and `BCC` on either transactional send
 *    (error 954).
 *  - **1000 subscribers** per bulk import call (error 209).
 *  - **1000 records** per page on every paged endpoint, with a floor of 10
 *    (error 801).
 *  - **50 unique addresses per day** for free sends (campaigns of ≤5 recipients),
 *    **15 addresses** per campaign preview (error 374) and **240 addresses per
 *    1440 minutes** for previews across a client (error 375).
 *  - **5 clients per 30 minutes** for client creation (error 172).
 *
 * None of them is reported back as a remaining count; each is enforced by
 * refusal with its own error code, which the client surfaces verbatim.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan and rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Campaign Monitor exposes no readable headroom outside /transactional. X-RateLimit-Limit, " +
      "-Remaining and -Reset are documented, but only on /transactional responses, and every " +
      "transactional endpoint either sends email or is refused with code 980 on accounts without " +
      "the feature — so reading them is not a side-effect-free probe. GET /billingdetails.json " +
      'returns {"Credits": n}, which is a balance with no ceiling, is 403 \'Not allowed for a ' +
      "Non-agency Customer' for a direct customer, and is meaninglessly zero on monthly-billed " +
      "plans, so it cannot be turned into a headroom fraction without inventing the denominator; " +
      "it is exposed as the billing-details-get Action instead. Every other limit is a fixed " +
      "constant enforced by refusal — 25 recipients per transactional send (954), 1000 " +
      "subscribers per import (209), pagesize 10–1000 (801), 15 preview recipients (374) and 240 " +
      "per 24h (375), 5 clients per 30 minutes (172) — and none of them reports a remaining count.",
  },
};

export default quota;
