/**
 * How much headroom is left — declared absence. Crunchbase documents a fixed
 * **rate limit of 200 calls per minute per key** in prose
 * (`docs/using-the-api`, "🚧 Rate Limit"), but:
 *
 *   - it publishes no response header of any kind on a live 401 probe
 *     (verified 2026-09-05 — `X-RateLimit-*`, `RateLimit-*` and similar are
 *     all absent), so there is nothing to read a remaining count from without
 *     spending a real, billable call against the connected key's own package;
 *   - the same paragraph also mentions a separate per-key **quota** ("If you
 *     ... exceed a quota") with no further documentation of what it is, how
 *     large it is, or how to read it back.
 *
 * A probe here could only report the fixed 200/minute ceiling itself, never
 * actual headroom against it — the same "a limit, not a balance" situation
 * the `algolia` app's quota check documents. `severity: "informational"`,
 * for the same reason as `service`.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate limit / quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Crunchbase documents a fixed 200-calls-per-minute rate limit plus an undocumented " +
      "per-key quota (docs/using-the-api), but exposes no response header or endpoint that " +
      "reports remaining headroom against either — verified 2026-09-05, no rate-limit header " +
      "of any kind on a live 401 response.",
  },
};

export default quota;
