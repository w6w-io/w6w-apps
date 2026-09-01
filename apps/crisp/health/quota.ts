/**
 * How much headroom is left on this token — declared absent, honestly.
 *
 * Crisp's own Rate-Limits guide (`docs.crisp.chat/guides/rest-api/rate-limits/`,
 * fetched 2026-09-01) documents daily request quotas in PROSE only — "10,000
 * req/day" for a Website Token — and states no response header of any kind
 * that would let a caller read remaining headroom. It says only what happens
 * once a limit is hit: "you will start receiving 429 Too Many Requests or 420
 * Enhance Your Calm HTTP errors". No `X-RateLimit-*`, no `Retry-After`
 * contract, nothing to parse.
 *
 * The reference itself (`references/rest-api/v1/`) exposes no account/token
 * endpoint that states remaining quota either — the closest resource,
 * `GET /v1/website/{website_id}`, returns only `name`, `domain`, `logo`,
 * `verified`, `institutional`.
 *
 * Per rfcs/healthcheck.md an App must be able to declare that no check exists
 * as "a first-class answer rather than an omission" — `severity:
 * "informational"` is required here and not cosmetic: an `unavailable` entry
 * always reports `unknown`, and at the default `degraded` severity that
 * `unknown` would propagate into every roll-up and pin this App there
 * permanently.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Daily request quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Crisp documents daily quotas only as prose (10,000 req/day for a Website Token, " +
      "guides/rest-api/rate-limits/) and publishes no response header or endpoint that states " +
      "remaining headroom — a rate-limited request gets a plain 429/420 with no numbers attached. " +
      "Humans can only infer usage by watching for those errors.",
  },
};

export default quota;
