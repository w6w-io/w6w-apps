/**
 * Qualtrics API quota — declared absent, honestly.
 *
 * ## What was checked, and how
 *
 * A `quota` check reads one of two signals: rate-limit response headers, or an
 * endpoint that states an allowance. Qualtrics publishes **neither**, and this
 * was established on the wire rather than inferred from silence in the docs.
 *
 * The response headers of the credential probe (`GET /API/v3/whoami` against
 * `iad1.qualtrics.com`, 2026-09-22, unauthenticated) were inspected directly:
 * there is no `X-RateLimit-*` header, no `RateLimit-*` header, no `Retry-After`,
 * and nothing else that counts requests. Qualtrics documents a `429` as the
 * refusal, without a readable remaining count or reset — the same shape Apify's
 * rate limiter has, and the reason that app also declares its rate meter absent.
 *
 * No endpoint in the covered surface reports plan limits, remaining API calls,
 * contact allowances or response counts. Guessing a header name would fabricate
 * exactly the answer this check exists to report.
 *
 * ## Why this is `unavailable` and not a guess
 *
 * Per rfcs/healthcheck.md, an App must be able to declare that no check exists
 * and have that be "a first-class answer rather than an omission".
 *
 * `severity: "informational"` is mandatory here and is not cosmetic: an
 * `unavailable` entry always reports `unknown`, and at the default `degraded`
 * severity that `unknown` would propagate into every roll-up and pin this App at
 * `unknown` permanently, regardless of how healthy everything else is.
 *
 * This is deliberately separate from the derived `auth:api-token` check: a
 * healthy credential reading must not imply something about rate headroom that
 * Qualtrics never told us.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Declared absent: Qualtrics publishes no rate-limit response headers and no endpoint that " +
    "states an allowance.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Qualtrics publishes no rate-limit response headers — the live `GET /API/v3/whoami` " +
      "response (checked on the wire 2026-09-22) carries no X-RateLimit-* or RateLimit-* header, " +
      "no Retry-After, and nothing else that counts requests; a 429 is the only signal. No " +
      "endpoint in the covered surface reports plan limits, remaining calls, contact allowances " +
      "or response counts. Usage and plan limits are visible to humans in the Qualtrics " +
      "account UI.",
  },
};

export default quota;
