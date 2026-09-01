import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Zendesk Sell publishes a fixed rate-limit ceiling — 36,000 requests/hour,
 * i.e. 10 requests/second, per access token — but no way to read how much of
 * it is left before you hit it.
 *
 * Verified two ways on 2026-09-01:
 *
 * 1. **The documentation.** `developer.zendesk.com/api-reference/sales-crm/rate-limits/`
 *    states the ceiling and says only: "If your limits reaches zero, subsequent
 *    requests will receive the 429 Too Many Requests response code until the
 *    request reset time has been reached." No response header is named
 *    anywhere on that page, nor on the Requests or Responses reference pages
 *    (which enumerate every header the API sends: `Content-Type`,
 *    `Content-Language`, `X-Request-Id`, `Vary` — no `X-RateLimit-*`).
 * 2. **The wire.** A live, authenticated `GET /v2/users/self` and an
 *    unauthenticated `GET /v2/accounts/self` were probed on 2026-09-01; neither
 *    response carried any `X-RateLimit-*`, `RateLimit-*` or similar header.
 *
 * `severity: "informational"` is load-bearing, not decorative: an `unavailable`
 * entry always reports `unknown`, and `unknown` outranks `ok` in a host's
 * roll-up — at any other severity this declared absence would pin the whole
 * App's health at `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Zendesk Sell enforces a fixed 36,000 requests/hour (10/second) ceiling per access token, " +
      "but exposes no remaining-quota signal: the rate-limits reference names no response header, " +
      "and a live response from api.getbase.com carries none of the usual X-RateLimit-* family. " +
      "The only observable signal is the 429 itself, once the limit is already exceeded.",
  },
};

export default quota;
