/**
 * API quota headroom — declared unavailable, because the one endpoint that
 * comes close does not expose the ceiling.
 *
 * `rest-api.md` states the daily quota in prose: "Each subscription is
 * allocated 50,000 API calls per day… Contact your account manager to
 * increase the daily quota" — so the real ceiling is per-subscription and
 * adjustable, not a constant this app can hardcode.
 *
 * `GET /rest/v1/stats/usage.json` (`usage.md`) reports today's total call
 * count and a per-user breakdown, but **never the ceiling itself** — there
 * is no `limit` or `quota` field in its response, and Marketo publishes no
 * `X-RateLimit-*`-style response headers on any endpoint (checked across
 * every fetched reference page). Reporting "remaining" against the
 * documented default of 50,000 would silently misreport any subscription
 * whose account manager raised it.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Marketo's daily quota (documented default 50,000 calls/day, adjustable per subscription " +
      "by the account manager) has no machine-readable ceiling: GET /rest/v1/stats/usage.json " +
      "reports today's call total but not the limit itself, and no endpoint publishes a " +
      "rate-limit response header. Headroom cannot be computed without knowing this " +
      "subscription's actual ceiling.",
  },
};

export default quota;
