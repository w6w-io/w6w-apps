/**
 * Do we have API quota left? — declared absent, not guessed.
 *
 * Checked 2026-09-05: no rate-limit or quota header of any kind (`x-ratelimit-*`,
 * `retry-after`, or otherwise) appears on any response measured live —
 * including the 401 a garbage/expired Bearer token gets — and none of LGL's
 * 33 per-resource Swagger sub-documents describes a quota field, response
 * header, or a dedicated usage/limits endpoint. The reference documents no
 * rate limit at all, only the resource CRUD surface.
 *
 * `unavailable` is the honest answer per rfcs/healthcheck.md "Declaring
 * absence". `severity: "informational"` so it never pins the roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  description:
    "Not exposed: no rate-limit/quota header appears on any live response (including a 401), " +
    "and none of LGL's documented resources exposes a usage/limits endpoint.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "No rate-limit header or quota endpoint is documented or observed anywhere in LGL's API.",
  },
};

export default quota;
