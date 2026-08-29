/**
 * Quota headroom — declared unavailable.
 *
 * Checked live on 2026-08-29: neither a successful nor a failed request to
 * `api.connecteam.com` (`GET /me`, unauthenticated and with a syntactically
 * plausible fake key) carried any rate-limit header of any kind — no
 * `X-RateLimit-*`, `RateLimit-*`, or `Retry-After`. The OpenAPI document
 * declares none either (searched for every case-insensitive occurrence of
 * "rate limit" in the 616,945-byte document: zero matches), and the public
 * developer docs describe no metered ceiling for the API-key auth path.
 *
 * This is a positive, stated absence per `packages/apps/HEALTHCHECKS.md`
 * rather than a silent gap: `severity: "informational"` keeps it from ever
 * pinning the app's overall verdict at `unknown`, since an `unavailable`
 * check always reports `unknown` and `unknown` outranks `ok` in the roll-up.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan / request headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason:
      "Connecteam publishes no rate-limit headers (checked live 2026-08-29 on both a signed and " +
      "an unsigned request) and no documented request ceiling for the API-key auth path.",
  },
};

export default quota;
