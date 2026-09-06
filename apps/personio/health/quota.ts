import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Personio publishes exactly TWO rate limits in prose, both hard-coded per-endpoint
 * numbers rather than an account-wide budget, and neither is readable in advance:
 *
 *  - The `/v1/auth` token endpoint: 150 requests/minute, throttled to 1/second for the
 *    next 60 seconds if exceeded (Personio's Authentication guide, read 2026-09-06).
 *  - `/company/documents` (Upload Document): 60 requests/minute (OpenAPI description).
 *
 * Neither `personio-personnel-data-api-oa3.yaml` nor `personio-auth-api.yaml` documents
 * a `X-RateLimit-*` / `RateLimit-*` response header on ANY endpoint, for a successful or
 * a rejected call — so there is nothing to read before a limit is hit, only the fixed
 * numbers above to stay under. Declaring `unavailable` here is a positive statement of
 * that fact rather than a guess at a header that does not exist in the source this app
 * was built from.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always reports
 * `unknown`, which outranks `ok` in a roll-up. At any other severity this declared
 * absence would pin the app's overall health verdict at `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Personio documents only fixed per-endpoint rate limits in prose (150/min " +
      "for /v1/auth, 60/min for /company/documents) and no X-RateLimit-*/RateLimit-* " +
      "response header on any endpoint in its own OpenAPI sources — so headroom cannot " +
      "be read before it runs out.",
  },
};

export default quota;
