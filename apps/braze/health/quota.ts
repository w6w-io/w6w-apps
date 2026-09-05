/**
 * Quota headroom — declared unavailable.
 *
 * Braze documents per-endpoint rate ceilings in prose (e.g. `/users/track`'s
 * 3,000 req/3s, most other endpoints' 250,000 req/hour default — both quoted
 * directly from each operation's `description` in the fetched spec), but the
 * spec declares no response headers for remaining/reset on any operation, and
 * this app has not observed any such header live (no valid credential was
 * available to probe with). Rather than guess a header name Braze might not
 * send, this is a stated absence per this pack's convention — `informational`
 * severity, so a host that surfaces it does not park the App at `unknown`
 * forever waiting for a check that will never run.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason:
      "Braze documents fixed per-endpoint rate ceilings in prose (3,000 req/3s on /users/track, " +
      "250,000 req/hour by default elsewhere) but the fetched OpenAPI spec declares no " +
      "response header carrying remaining quota or reset time on any operation.",
  },
};

export default quota;
