import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Nutshell documents rate limiting only in prose, and exposes no headers to
 * read it from.
 *
 * Nutshell's own JSON-RPC docs say: "We make every effort to make your data
 * as accessible as possible. To maintain a high quality of service, we rate
 * limit a few large requests. Most notably, find (e.g. findLeads()) requests
 * with non-stub responses... To a lesser extent, excessive get requests...
 * are also rate-limited. The degree of rate-limiting may change dependent on
 * current conditions." No numeric limit, window, or reset time is stated.
 *
 * Verified live 2026-09-06: a successful `findLeads` response carried none
 * of `RateLimit`, `RateLimit-Limit`/`-Remaining`/`-Reset`,
 * `X-Rate-Limit-*`, or `Retry-After` — only Nutshell-specific tracing
 * headers (`x-nutshell-request-id`, `x-nutshell-instance-id`,
 * `x-nutshell-app-version`) and a caching `etag`. There is nothing on the
 * wire for this check to read.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, which outranks `ok` in a roll-up — at any other
 * severity this declared absence would pin the App's verdict at `unknown`
 * forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Nutshell documents rate-limiting only in prose (unspecified limits on find/get " +
      "requests) and returns no RateLimit, X-Rate-Limit-* or Retry-After header on a successful " +
      "call (verified live 2026-09-06) — there is no headroom figure available to read.",
  },
};

export default quota;
