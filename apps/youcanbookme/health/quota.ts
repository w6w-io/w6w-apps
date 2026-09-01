import type { HealthCheckDefinition } from "@w6w/types";

/**
 * YouCanBookMe documents a 429 rate-limit response (its current Stoplight
 * project description, fetched 2026-09-01: "Whenever you encounter a 429
 * response this means your account hit the rate limit") but states no
 * budget, window, or readable headroom endpoint. A live, unauthenticated
 * probe on 2026-09-01 (`GET /v1/bookings`, 400 response) carried no
 * `x-ratelimit-*`/`ratelimit-*` response header of any kind — only
 * `X-Total`/`X-Next-Cursor` pagination headers and standard CORS/security
 * headers. Throttling exists but cannot be read ahead of time, only budgeted
 * from an observed 429.
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`,
 * which an informational check never allows to worsen a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "YouCanBookMe documents a 429 rate-limit response but no budget, window, or readable " +
      "headroom endpoint, and a live probe carried no rate-limit response header.",
  },
};

export default quota;
