/**
 * Declared absence: quota headroom.
 *
 * The Conversions API docs (`integrations/ads-reporting/conversions-api`,
 * read 2026-09-05) name a hard ceiling — "a maximum of 600 requests per
 * minute from your member access token and a maximum of 500,000 requests
 * per day from your member access token" — but no response header or
 * endpoint exposes how much of either budget remains. Live probes run for
 * this app (`GET /rest/conversions?q=account`, `GET /rest/conversionEvents`,
 * both unauthenticated and with a garbage bearer token, 2026-09-05) carried
 * none of the `X-RateLimit-*` headers this pack's other apps read for a
 * `quota` check — only LinkedIn's internal routing/tracing headers
 * (`x-li-fabric`, `x-li-pop`, `x-li-uuid`, …) were present.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in a roll-up — at any other
 * severity this would pin the app's verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate limit headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason: "LinkedIn documents a 600-requests-per-minute and 500,000-requests-per-day ceiling " +
      "per access token on the Conversions API, but exposes no response header or endpoint that " +
      "reports remaining headroom for either. Only a 429/throttle response itself signals " +
      "exhaustion.",
  },
};

export default quota;
