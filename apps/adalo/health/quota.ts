import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Adalo publishes no headroom to read. The docs state a fixed 5 requests/second
 * rate limit per app (429 on excess, no documented `Retry-After` or
 * `X-RateLimit-*` header of any kind — checked live: neither an unsigned nor a
 * signed-with-bogus-token request returns any rate-limit header). Separately,
 * Adalo also meters "App Actions" per billing cycle (a plan-level allowance
 * the Error Codes doc says causes API requests to fail once exhausted), but
 * that count is only visible in the Adalo builder's own dashboard, not via
 * this API. Declared rather than omitted, so a host can tell "we cannot know"
 * from "nobody looked".
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and
 * an informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Adalo publishes no headroom endpoint and returns no rate-limit headers on any response " +
      "(checked live, unsigned and with a bogus Bearer token). It enforces a fixed 5 " +
      "requests/second rate limit per app (429 on excess) and a separate, plan-metered " +
      '"App Actions per billing cycle" allowance that is visible only in the Adalo builder\'s ' +
      "own dashboard, not through this API.",
  },
};

export default quota;
