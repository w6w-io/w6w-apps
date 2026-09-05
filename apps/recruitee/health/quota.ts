/**
 * Recruitee publishes no rate-limit or plan-usage signal this app can read.
 *
 * Checked both ways on 2026-09-05: the vendor's own reference (see
 * `lib/client.ts` for how it was fetched and cross-checked) documents no
 * `/limits`/`/usage`-style endpoint anywhere in its 247 resource groups, and a
 * live request against `api.recruitee.com` carries no `X-RateLimit-*`,
 * `RateLimit-*` or similarly-named response header on either a 401 or a
 * successful call. Declared as a positive fact — `informational`, so its
 * permanent `unknown` never pins the app's overall verdict there — rather than
 * silently omitted.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan headroom",
  kind: "quota",
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason: "Recruitee documents no rate-limit or plan-usage endpoint, and none of its response " +
      "headers carry one (checked live against api.recruitee.com on 2026-09-05).",
  },
};

export default quota;
