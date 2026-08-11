import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Datadog publishes no *readable-in-advance* API quota, so this declares
 * `unavailable` with a reason rather than pretending to probe one.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every Datadog verdict at `unknown`
 * forever.
 *
 * ## What Datadog actually exposes, measured and read
 *
 * Datadog documents five headers — `X-RateLimit-Limit`, `X-RateLimit-Period`,
 * `X-RateLimit-Remaining`, `X-RateLimit-Reset` and `X-RateLimit-Name` — and they
 * are genuinely useful. What they are not is *askable*:
 *
 * 1. **They are per-endpoint, and they only appear on that endpoint's own
 *    response.** Datadog's own words: "APIs can have unique, distinct rate limit
 *    buckets or be grouped together into a single bucket depending on the
 *    resource(s) being used", and `X-RateLimit-Name` exists precisely to tell
 *    you which bucket you just spent from. There is no aggregate endpoint. A
 *    check that probed one endpoint would report one bucket's headroom and imply
 *    it covered the other twenty-one Actions, which is the kind of confident
 *    nonsense a health surface exists to prevent.
 * 2. **Nothing carries them unauthenticated.** Measured 2026-08-11 on
 *    `api.datadoghq.com`: the `403` from `GET /api/v1/validate` and the `401`
 *    from `GET /api/v1/monitor` each carried exactly `content-type`,
 *    `content-length`, `date`, `x-content-type-options` and
 *    `strict-transport-security` — no `X-RateLimit-*` of any kind. So there is
 *    no unsigned probe to declare, and the signed alternative would still hit
 *    problem 1.
 * 3. **The three submission endpoints are metered differently again.** Datadog
 *    states it "does not rate limit on data point/metric submission", that "the
 *    API for sending logs is not rate limited", and that event submission is
 *    capped at 250,000 events per minute per organization — a limit with no
 *    header at all. So for two of this app's twenty-two Actions the headers do
 *    not exist even in principle.
 *
 * ## Where the answer actually lives, and why it is not this check
 *
 * Datadog meters itself: `datadog.apis.usage.per_org`, `per_user`,
 * `per_api_key` and their `*_ratio` variants report allowed and blocked requests
 * tagged by `limit_name`, `limit_period`, `limit_count` and `rate_limit_status`.
 * Those are ordinary timeseries, so **this app can already read them** — point
 * the `metric-query` action at
 * `sum:datadog.apis.usage.per_org_ratio{*} by {limit_name}` and you have real
 * per-bucket headroom, in a workflow, today. That is not a deferral: it needs
 * nothing this app does not already ship.
 *
 * It is deliberately not wired in as the health probe, for the reason
 * `HEALTHCHECKS.md` gives in "Choosing a probe": querying timeseries needs the
 * `timeseries_query` authorization scope, which a correctly-narrowed application
 * key may legitimately lack — and a key scoped to exactly what its workflows
 * read is the configuration Datadog recommends. A health check that reported
 * such a key as broken would be worse than no check at all.
 *
 * When a limit does bite, it is not silent: `lib/client.ts` surfaces the `429`
 * with Datadog's own message and points at `X-RateLimit-Reset`.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Datadog exposes rate-limit headroom only as X-RateLimit-Limit / -Period / -Remaining / " +
      "-Reset / -Name headers on the response of the endpoint you just called, in a per-endpoint " +
      "bucket named by X-RateLimit-Name; there is no aggregate quota endpoint, so any single " +
      "probe would report one bucket and imply it spoke for all twenty-two actions. " +
      "Unauthenticated responses carry no X-RateLimit header at all (measured 2026-08-11 on the " +
      "403 from GET /api/v1/validate and the 401 from GET /api/v1/monitor), and metric and log " +
      "submission are documented as not rate limited while event submission is capped at 250,000 " +
      "events/minute per org with no header. Real per-bucket headroom is available as ordinary " +
      "metrics — datadog.apis.usage.per_org / per_user / per_api_key and their _ratio variants, " +
      "tagged by limit_name — and this app's `metric-query` action reads them; that is not the " +
      "health probe because querying timeseries needs the timeseries_query scope a correctly " +
      "narrowed application key may legitimately lack.",
  },
};

export default quota;
