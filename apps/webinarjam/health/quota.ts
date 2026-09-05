import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Do we have request headroom left? — declared absent, not guessed.
 *
 * The vendor documents only a flat, prose ceiling: "a hardcoded limit of 20
 * API calls per second per user," enforced with a bare `429 (Too many
 * requests)`. There is no account/usage endpoint and — measured live
 * 2026-09-05 against every one of the five real endpoints (both with a
 * missing and an invalid `api_key`) — no `X-RateLimit-*`/`Retry-After`-shaped
 * response header of any kind on either success or failure. A fixed,
 * undocumented-remaining ceiling is not something a side-effect-free probe can
 * report headroom from.
 *
 * `unavailable` is the honest answer per rfcs/healthcheck.md "Declaring
 * absence". `severity: "informational"` so it never pins the app's roll-up
 * verdict at `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request-rate headroom",
  description:
    "Not exposed: WebinarJam/EverWebinar document only a flat 20 calls/second ceiling (429 on " +
    "excess) with no account/usage endpoint and no rate-limit response header of any kind.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "No usage endpoint or rate-limit header is documented or observed live; only a fixed, " +
      "prose-only 20 requests/second ceiling enforced with a bare 429.",
  },
};

export default quota;
