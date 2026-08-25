/**
 * There is nothing to poll for request-rate headroom.
 *
 * ## What is documented
 *
 * Verified 2026-08-25 against `docs.shipstation.com/rate-limits`: ShipStation limits
 * accounts to **200 requests/minute** in production and **20 requests/minute** in the
 * Sandbox environment, answering `429 Too Many Requests` over that with a
 * `Retry-After` header stating how many seconds to wait.
 *
 * ## Why there is nothing to poll
 *
 * That is a per-minute burst ceiling, not a metered quota with a running balance.
 * There is no usage endpoint and, measured live the same day, **no `X-RateLimit-*`
 * header on an ordinary (non-429) response at all** — the response to an
 * unauthenticated `GET /v2/labels` carried `date`, `content-type`,
 * `x-shipengine-requestid` and several security headers, but nothing naming a limit or
 * a remaining count. A check could therefore only ever answer `unknown`, and only at
 * the cost of a request against the very budget it claims to be measuring.
 *
 * The consequence is surfaced instead where it is actionable: `describeError` in
 * `lib/client.ts` turns a live `429` into a message naming both limits and pointing at
 * `Retry-After`, so the failure explains itself when it actually happens.
 *
 * `severity: "informational"` because an `unavailable` entry always reports `unknown`,
 * and an informational check never worsens a roll-up verdict on its own.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason: "ShipStation's documented limit (200 requests/minute production, 20/minute " +
      "Sandbox — docs.shipstation.com/rate-limits, verified 2026-08-25) is a per-minute burst " +
      "ceiling with no running balance to report, no usage endpoint, and — measured live the " +
      "same day — no `X-RateLimit-*` header of any kind on a successful response. `Retry-After` " +
      "is documented only on the `429` response itself, which `lib/client.ts` surfaces on the " +
      "call that actually hits the limit rather than pretending there is headroom to poll.",
  },
};

export default quota;
