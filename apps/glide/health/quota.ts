import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Glide publishes no request-rate headroom to read, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * ## Verified two ways on 2026-09-06
 *
 * 1. **Nothing on the wire.** A live response from `api.glideapps.com/tables`
 *    carries no `RateLimit-*`, `X-RateLimit-*` or `Retry-After` header, signed
 *    or unsigned.
 * 2. **Nothing in the specification.** Glide's OpenAPI document (69,411 bytes,
 *    14 operations) declares no `429` response on any path and contains zero
 *    occurrences of `RateLimit`, `X-RateLimit`, `Retry-After` or `throttl`.
 *
 * ## The limits that DO exist, and why none of them is this check
 *
 * `docs/classic-api/general/limits` documents a payload ceiling (15 MB per
 * request — use stashing above that) and per-endpoint row-count ceilings
 * (Create/Overwrite Table: 8,000,000 rows; Add Rows to Table: 250,000 rows).
 * Both are capacity facts about a single call's *size*, not an allowance that
 * depletes with request volume and could be reported as headroom.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, which outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin this App's verdict at `unknown`
 * forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Glide publishes no request-rate headroom: a live api.glideapps.com response carries no " +
      "RateLimit-*, X-RateLimit-* or Retry-After header, and its OpenAPI document (14 operations) " +
      "declares no 429 response on any path. What it does limit is a single request's payload " +
      "(15 MB — use stashing above that) and per-endpoint row-count ceilings (Create/Overwrite " +
      "Table: 8,000,000 rows; Add Rows to Table: 250,000 rows) — capacity facts, not a metered " +
      "allowance that could be read as remaining headroom.",
  },
};

export default quota;
