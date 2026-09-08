/**
 * Do we have request-rate headroom left? — declared absent, not guessed.
 *
 * WebinarGeek documents fixed numeric ceilings (300 requests/minute, 5,000/hour, 25,000/day;
 * 10/100/500 respectively on a free trial) and states plainly that exceeding one gets a bare
 * `429`. But neither the spec nor a live probe exposes any remaining-headroom signal to read
 * BEFORE that happens: verified 2026-09-06, a live 401 response from `GET /account` (both with
 * no `Api-Token` header and with a syntactically valid but wrong one) carries no
 * `X-RateLimit-*`/`RateLimit-*`-shaped header of any kind, and the spec's own "Response codes"
 * table documents `429` as the only rate-limit signal WebinarGeek gives. A limit is not a
 * balance — there is nothing here for a side-effect-free probe to observe.
 *
 * `unavailable` is the honest answer per rfcs/healthcheck.md "Declaring absence".
 * `severity: "informational"` so it never pins the roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request-rate headroom",
  description:
    "Not exposed: WebinarGeek documents fixed per-minute/hour/day request ceilings but no " +
    "response header or endpoint reports remaining headroom against them — only a bare 429 " +
    "once a ceiling is hit.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "No rate-limit response headers were observed live, and the API Blueprint documents none " +
      "— only a 429 status once a fixed per-minute/hour/day ceiling is exceeded.",
  },
};

export default quota;
