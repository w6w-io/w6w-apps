/**
 * Is there rate-limit headroom left on this credential? — declared absent, not
 * guessed.
 *
 * Bloomerang's OpenAPI document declares no rate-limit response headers on any
 * endpoint, and this was confirmed live (2026-09-01): a real request/response
 * cycle against `GET /v2/user/current` (both the unauthenticated 401 and an
 * invalid-key 401) carried no `RateLimit`, `X-RateLimit-*`, `Retry-After`, or
 * any similarly-named header — only the standard IIS/ASP.NET response set.
 * Nothing in the API's published behavior gives a workflow advance warning of
 * throttling.
 *
 * `unavailable` is the honest answer per `rfcs/healthcheck.md` "Declaring
 * absence" — a better one than a `check` that always returns `unknown`.
 * `severity: "informational"` so this entry never pins the App's roll-up
 * verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Not exposed: Bloomerang's REST API v2 documents no rate-limit response headers, and none " +
    "were observed live on either a successful or a rejected request.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Bloomerang publishes no rate-limit headers or quota endpoint anywhere in the v2 API.",
  },
};

export default quota;
