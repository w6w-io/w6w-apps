/**
 * Rate-limit headroom — a declared absence.
 *
 * Razorpay's OpenAPI document declares a `429` response on every list/create
 * endpoint with the advice "Implement exponential backoff with jitter before
 * retrying" and states no numeric ceiling anywhere. Live probes on
 * 2026-09-01 (`GET /v1/payments`, both an authenticated 401 and a fully
 * authenticated request) carried **no** `X-RateLimit-*`, `RateLimit-*` or
 * `Retry-After` header on any response, success or failure. There is
 * therefore nothing to read in advance — the only signal Razorpay gives is
 * the `429` itself, after the fact.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, `unknown` outranks `ok` in the roll-up, and at any other
 * severity this would pin the app's verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  kind: "quota",
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason: "Razorpay publishes no rate-limit headers of any kind (checked signed and unsigned, " +
      "success and 401) and documents no numeric ceiling — only that a 429 can happen and to " +
      "back off with jitter when it does.",
  },
};

export default quota;
