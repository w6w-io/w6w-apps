import type { HealthCheckDefinition } from "@w6w/types";

/**
 * GetResponse throttles, and publishes no way to read how much is left — so
 * this declares `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 *
 * ## Verified two ways on 2026-08-11
 *
 * 1. **Nothing on the wire.** A live response from `api.getresponse.com` carried
 *    `strict-transport-security`, `x-content-type-options` and `x-unique-id` —
 *    and no `RateLimit-*`, no `X-RateLimit-*` and no `Retry-After`.
 * 2. **Documented, but only as a refusal.** The vendor's OpenAPI document
 *    declares a `429` on **every single endpoint**, with error code **1015** and
 *    the description "Too many request to API, quota reached, please wait till
 *    next quota window". So the limit is real and the window is real, but the
 *    only signal is the rejection itself.
 *
 * ## The other "limit" that is not this one
 *
 * `GET /accounts/sending-limits` exists and is tempting, but it reports how many
 * *emails* the account may send — a deliverability allowance, not API request
 * headroom. Reporting it here would answer a different question than the check
 * asks, so it is deliberately not used.
 *
 * `lib/client.ts` surfaces code 1015 distinctly when it does happen, which is
 * the most useful thing available: a workflow that sees it knows to back off
 * rather than to fix its input.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "GetResponse publishes no readable request headroom: a live API response carries no " +
      "RateLimit-*, X-RateLimit-* or Retry-After header. Throttling is real — its OpenAPI " +
      "document declares a 429 on every endpoint, with code 1015 and the message 'quota reached, " +
      "please wait till next quota window' — but it is enforced by refusal, so nothing can be " +
      "read before it runs out. The /accounts/sending-limits endpoint reports an EMAIL sending " +
      "allowance rather than API request quota, and is deliberately not used here.",
  },
};

export default quota;
