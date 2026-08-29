import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is this workspace close to Instantly's rate limit? — declared `unavailable`
 * rather than guessed.
 *
 * `developer.instantly.ai/getting-started/rate-limit` documents two FIXED
 * ceilings — "No more than 100 requests per second" and "No more than 6,000
 * requests per minute" — shared across the whole workspace, across every API
 * key, and across API v1 and v2 together. That guide names no response header
 * that carries current consumption, and a live probe on 2026-08-29 (both an
 * unauthenticated request and one with a syntactically-plausible-but-wrong
 * bearer token, against `GET /api/v2/campaigns` and `GET /api/v2/accounts`)
 * returned no `X-RateLimit-*`, `RateLimit-*` or any other consumption header
 * on the `401` response in either case. Instantly's own guidance for staying
 * under the ceiling is entirely client-side — batch calls and add a wait
 * between batches — which is a workaround for the absence of a live headroom
 * signal, not evidence one exists.
 *
 * This is distinct from `Account.warmup`/quota-style plan limits (covered by
 * `account-warmup-analytics-get` and `account-daily-analytics-get`, which read
 * real, vendor-reported figures): this check is specifically about the
 * *request-rate* ceiling, and nothing in the documented surface exposes how
 * much of it is left before a `429`. `severity: "informational"` so a
 * documented absence can never worsen a roll-up verdict.
 */
const rateLimit: HealthCheckDefinition = {
  key: "rate-limit",
  title: "Request-rate headroom",
  description: "Instantly documents fixed, workspace-wide ceilings (100 requests/second, 6,000 " +
    "requests/minute, shared with API v1) but exposes no response header or endpoint that " +
    "reports current consumption against them (verified live 2026-08-29), so there is nothing " +
    "to probe ahead of a 429.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Instantly's rate-limit guide states fixed request-per-second and request-per-minute " +
      "ceilings but documents no response header or endpoint exposing current usage against " +
      "them; a live probe on 2026-08-29 confirmed no X-RateLimit-*/RateLimit-* header on error " +
      "responses either.",
  },
};

export default rateLimit;
