/**
 * Do we have request headroom left? — declared absent, not guessed.
 *
 * AWeber's own docs state the limit in prose only: "AWeber API requests are
 * limited to 120 requests per minute, per customer account." No response
 * header carries a remaining count or a reset time — verified live
 * 2026-09-05, an unauthenticated request to `GET /1.0/accounts` returns no
 * `X-RateLimit-*`, `RateLimit-*`, or `Retry-After` header on its `400`, and
 * the OpenAPI document's `429`-equivalent responses (modeled as `403
 * ForbiddenError`, ambiguous with a permissions problem — see
 * `lib/client.ts`) carry no numeric fields either. There is nothing this
 * check can read without spending a real, signed call and then inferring
 * headroom from whether it happened to succeed — which is not a probe, it is
 * a guess.
 *
 * `unavailable` is the honest answer per `rfcs/healthcheck.md`'s "Declaring
 * absence". `severity: "informational"` so it never pins the roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request-rate headroom",
  description:
    "Not exposed: AWeber documents its 120 requests/minute limit only in prose and returns no " +
    "rate-limit headers on any response.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "AWeber returns no rate-limit headers on any endpoint; the 120/minute ceiling is " +
      "documented only in prose.",
  },
};

export default quota;
