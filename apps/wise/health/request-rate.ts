import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Wise publishes no readable rate-limit headroom, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity a declared absence would pin this app's verdict at `unknown`
 * forever.
 *
 * ## Verified two ways on 2026-09-05
 *
 * 1. **Nothing on the wire.** Live responses from `api.wise.com` (both a 200
 *    from `GET /2026Q3/currencies` and a 401 from `GET /2026Q3/profiles`)
 *    carried no `X-RateLimit-*`, `Retry-After`, or any other quota header —
 *    only the standard `date`, `content-type`, `cache-control`, Cloudflare's
 *    own tracing headers, and cookies.
 * 2. **Nothing in the documentation.** The only performance surface Wise
 *    publishes is `docs.wise.com/api-performance`, which reports daily
 *    *availability* percentages (uptime), not request quotas or remaining
 *    call counts. Neither the OpenAPI bundle nor the auth-and-security guide
 *    documents a rate-limit ceiling or a response header that would reveal
 *    one.
 *
 * If Wise begins exposing this, the natural home is a `quota` check reading
 * whatever header or endpoint it lands on — kept separate from `service`
 * (uptime) and from anything credential-scoped, for the same reason Apify's
 * sibling app keeps its own quota and request-rate checks apart.
 */
const requestRate: HealthCheckDefinition = {
  key: "request-rate",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Wise exposes no rate-limit headroom: live API responses carry no X-RateLimit-* or " +
      "Retry-After header, and the only published performance data (docs.wise.com/api-performance) " +
      "is daily uptime percentage, not request quota. There is no documented ceiling or remaining " +
      "count to report.",
  },
};

export default requestRate;
