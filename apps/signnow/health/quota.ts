/**
 * SignNow publishes no rate-limit / quota headers.
 *
 * Verified live 2026-08-25 against both `GET /user` (signed, 400 for a bad
 * token) and `POST /oauth2/token` (400 for bad Basic credentials) — neither
 * response carries an `X-RateLimit-*`, `RateLimit-*` or any other quota
 * header, and the OpenAPI contract documents none either. A declared absence,
 * `severity: "informational"`, so the App does not sit at `unknown` forever
 * for a signal SignNow never sends.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "SignNow's API responses carry no rate-limit / quota headers (verified live 2026-08-25), " +
      "and its OpenAPI contract documents none.",
  },
};

export default quota;
