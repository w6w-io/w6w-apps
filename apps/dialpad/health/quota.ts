/**
 * Quota headroom — declared unavailable.
 *
 * Dialpad is a phone system billed by seat/license, not a metered API with a
 * spend ceiling: there is no `/limits` or `/usage` endpoint anywhere in the
 * OpenAPI document, and `company.get`'s own response (`account_type`, `state`,
 * `office_count`) carries plan tier and enablement, never a consumption figure.
 *
 * What DOES exist is a **fixed, per-endpoint rate limit**, stated in each
 * operation's own description (`x-ratelimit`) — e.g. 1200/minute for most
 * writes, 20/minute for `company.get` and `users.list`, 5/minute for
 * `call.initiate`. Live probes on 2026-08-29 (both a 401 and a 200 response)
 * carried **no** `X-RateLimit-*`, `RateLimit-*` or any other rate-limit header
 * at all — the ceilings are published in prose, not exposed on the wire, so
 * there is nothing here to read into a {@link HealthQuota} reading. This is the
 * same shape as Apify's `request-rate` absence: a real, documented limit with
 * no live headroom signal.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, `unknown` outranks `ok` in the roll-up, and at any other
 * severity this would pin the app's verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan / rate headroom",
  description:
    "Dialpad publishes fixed per-endpoint rate limits in its API reference (e.g. 1200/minute for " +
    "most writes) but exposes no response header carrying a remaining count or reset time, and " +
    "has no metered usage/spend endpoint to read a plan ceiling from.",
  kind: "quota",
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason:
      "Dialpad documents rate limits per endpoint in prose only — no X-RateLimit-* or similar " +
      "header was observed on any live response (checked 2026-08-29) — and publishes no " +
      "usage/spend endpoint at all.",
  },
};

export default quota;
