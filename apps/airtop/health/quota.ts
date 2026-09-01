/**
 * Credit / quota headroom — declared unavailable.
 *
 * Airtop meters usage in "credits" (every AI-driven window interaction's
 * response carries `meta.usage.credits` — see `lib/client.ts`), but nothing in
 * the OpenAPI document exposes a *balance* or *remaining* figure: no response
 * header was documented on any operation (checked every `responses[].headers`
 * entry in the spec — only `content-type` appears, on every single one), and
 * no path under the `public`-audience surface reads back an account's credit
 * balance or plan ceiling. `GET /v1/sessions` (the auth probe) and every other
 * probed endpoint answered with no rate-limit or credit header on 2026-09-01.
 *
 * Rather than fabricate a threshold or silently omit this check — which would
 * leave the App pinned at `unknown` forever, per `HEALTHCHECKS.md` — this is a
 * declared absence: a stated positive fact that Airtop publishes no headroom
 * signal this app can read, not a gap nobody looked at.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit headroom",
  kind: "quota",
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason:
      "Airtop's OpenAPI document declares no rate-limit or credit-balance response header on any " +
      "operation, and no endpoint in the public API surface reads back an account's credit " +
      "balance or plan ceiling (verified 2026-09-01). Each AI-driven interaction reports the " +
      "credits IT consumed (meta.usage.credits), but that is spend, not remaining headroom.",
  },
};

export default quota;
