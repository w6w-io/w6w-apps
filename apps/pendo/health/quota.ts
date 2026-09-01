import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Pendo publishes no remaining allowance anywhere in a response.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request headroom",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason: "Searched Pendo's own ~1.1MB Postman API collection (fetched live 2026-09-01 from " +
      "engageapi.pendo.io, which describes itself as the source of truth for Pendo's API docs) " +
      "for any mention of rate limits, quotas, or throttling headers — zero hits for " +
      '"rate limit", "X-RateLimit", or "Retry-After" across every endpoint\'s documented ' +
      "request and response. No authenticated credential was available to inspect live response " +
      "headers directly, and nothing in the collection's own text names a header or endpoint " +
      "that would report one.",
  },
};

export default quota;
