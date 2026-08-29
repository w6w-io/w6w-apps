import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Whop publishes no readable request-rate headroom, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity a declared absence would pin every verdict at `unknown`
 * forever.
 *
 * ## Verified two ways on 2026-08-29
 *
 * 1. **Nothing on the wire.** Live responses from `api.whop.com` — both a
 *    successful public read and a rejected authenticated one — carried no
 *    `X-RateLimit-*`, no `RateLimit-*`, and no other request-budget header of
 *    any kind; only standard Cloudflare/Rails infrastructure headers.
 * 2. **Nothing in the documentation ahead of a refusal.** Whop's own
 *    troubleshooting guide: "For `/api/v1` requests, Whop tracks request
 *    volume per API operation and API credential. The default limit is 600
 *    requests per minute." The only signal is the `429` itself, whose body
 *    carries a human sentence — `{"error":{"type":"rate_limit_exceeded",
 *    "message":"Try again in 12 seconds."}}` — not a machine-readable reset
 *    field a health check could poll in advance.
 *
 * The ceiling is fixed and documented (600 requests/minute, scoped per
 * *operation and credential* rather than per account as a whole), and Whop's
 * own remedy is to wait for the delay named in the 429 body and retry with
 * exponential backoff — a client behaviour, not something a health check can
 * read ahead of time.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Whop exposes no remaining-request count: live api.whop.com responses carry no " +
      "X-RateLimit-* or RateLimit-* header of any kind, and the troubleshooting docs state the " +
      "only signal is the 429 refusal itself, whose body names a retry delay in prose " +
      '("Try again in 12 seconds") rather than a machine-readable reset time. The documented ' +
      "ceiling is fixed — 600 requests/minute per API operation and credential — and the " +
      "documented remedy is client-side exponential backoff after a 429.",
  },
};

export default quota;
