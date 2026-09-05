/**
 * SignRequest publishes no rate-limit / quota headers.
 *
 * Verified live 2026-09-05 against both an unauthenticated `GET /documents/` (401,
 * `{"detail":"Authentication credentials were not provided."}`) and a bad-token `GET /documents/`
 * (401, `{"detail":"Invalid token"}`) — neither response carries an `X-RateLimit-*`, `RateLimit-*`
 * or any other quota header, and the OpenAPI contract (`/api/v1/schema/swagger.json`) documents
 * none either. A declared absence, `severity: "informational"`, so the App does not sit at
 * `unknown` forever for a signal SignRequest never sends.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "SignRequest's API responses carry no rate-limit / quota headers (verified live " +
      "2026-09-05), and its OpenAPI contract documents none.",
  },
};

export default quota;
