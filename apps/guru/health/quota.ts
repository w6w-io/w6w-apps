/**
 * Rate-limit headroom — declared absent, not faked.
 *
 * Guru's OpenAPI document declares no response headers anywhere in its 175
 * paths (checked programmatically against the full document, 2026-09-05), and
 * a live, unauthenticated `GET /api/v1/whoami` on the same day carried no
 * `X-RateLimit-*`, `RateLimit-*`, or any other quota-shaped header — only the
 * standard security/caching headers a reverse proxy adds. There is nothing to
 * probe or read: no dedicated limits endpoint like Apify's
 * `/v2/users/me/limits`, and no response header like GitHub's `/rate_limit`.
 *
 * `severity: "informational"` so this entry never pins the App's roll-up
 * verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description:
    "No machine-readable surface: Guru's OpenAPI document declares no response headers, and " +
    "none were observed live on any endpoint.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Guru publishes no rate-limit headers or quota endpoint anywhere in its documented API " +
      "surface.",
  },
};

export default quota;
