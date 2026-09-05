/**
 * Do we have quota left? — declared unavailable.
 *
 * Searched every Connect API reference page fetched 2026-09-05 (auth,
 * designs, folders, assets, exports, autofills, brand templates, users, the
 * "API requests and responses" and "Error responses" fundamentals pages) for
 * a rate-limit response header of any kind (`X-RateLimit-*`, `RateLimit-*`,
 * `Retry-After`, etc.) — none is documented anywhere. Every endpoint states
 * its limit only as prose ("rate limited to N requests per minute"), and the
 * `429 too_many_requests` error body carries no remaining-quota figure
 * either. There is nothing a successful response could expose that would
 * answer "how much headroom is left before the next call gets throttled".
 *
 * Per rfcs/healthcheck.md, declaring absence honestly (`unavailable`) beats
 * a check that either lies (reports `ok` from a probe that proves nothing)
 * or silently doesn't exist. `severity: "informational"` so the permanent
 * `unknown` this produces never worsens a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason: 'Canva Connect documents per-endpoint rate limits only as prose ("N requests per ' +
      'minute") and publishes no response header — successful or 429 — that exposes ' +
      "remaining headroom.",
  },
};

export default quota;
