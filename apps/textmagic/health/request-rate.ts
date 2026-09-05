import type { HealthCheckDefinition } from "@w6w/types";

/**
 * TextMagic publishes no readable request-rate headroom, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in a roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 *
 * ## Verified two ways on 2026-09-05
 *
 * 1. **Nothing on the wire.** Live 200 and 401 responses from
 *    `rest.textmagic.com` carried no `X-RateLimit-*`, `RateLimit-*` or any
 *    other rate-headroom header — only ordinary `date`/`content-type`/
 *    `content-length`/CORS headers.
 * 2. **Nothing in the documentation.** The "Restrictions and Limits" section
 *    of `docs.textmagic.com` states the ceilings as fixed prose numbers and
 *    says the only signal of exceeding them is the `429` response itself:
 *    "You may not execute more than 50 requests per second. If you do, a
 *    `429 Too Many Requests` error will be returned." Four endpoints (`DELETE
 *    /contacts/blocked`, `PUT /contacts/{id}`, `PUT`/`POST
 *    /lists/{id}/contacts`) are documented at a stricter 5 requests/second,
 *    but neither ceiling is exposed as a readable count anywhere.
 *
 * Account balance, which IS readable, is reported by the `quota` check
 * instead — a wholly different kind of ceiling (pre-paid spend, not request
 * throughput).
 */
const requestRate: HealthCheckDefinition = {
  key: "request-rate",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "TextMagic exposes no remaining-request count: live responses carry no X-RateLimit-*/" +
      "RateLimit-* header of any kind, and the 'Restrictions and Limits' documentation states " +
      "the only signal of exceeding the 50-requests/second ceiling (5/second on four write " +
      "endpoints) is the 429 response itself. Account balance, which IS readable, is reported " +
      "by the `quota` check instead.",
  },
};

export default requestRate;
