import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Dust exposes no readable request-rate headroom, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * Verified two ways on 2026-09-05:
 *
 * 1. **Nothing on the wire.** A live response from `dust.tt/api/v1/...`
 *    (success and 401 alike) carries only standard security headers
 *    (`strict-transport-security`, `x-content-type-options`,
 *    `referrer-policy`, `alt-svc`) plus `content-type`/`content-length` — no
 *    `X-RateLimit-*`, no `Retry-After` even on a probed 429 path.
 * 2. **The documented ceilings are fixed, not a live budget.**
 *    `docs.dust.tt/docs/developer-platform/core-concepts/rate-limits` states
 *    exactly two numbers: 120 document upserts/minute per workspace (a
 *    Data Sources write path this app does not call — it only reads/searches
 *    data sources), and 10,000 Dust App runs/day per app (the deprecated
 *    legacy Dust Apps surface this app does not implement at all). Nothing
 *    is documented for the agent/conversation/spaces/data-source-read
 *    surface this app actually calls — Create Conversation and Create
 *    Message document a `429` response is *possible*, but state no ceiling
 *    and expose no counter.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, which outranks `ok` in a roll-up, so at any other
 * severity a declared absence would pin the app's overall verdict at
 * `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Dust exposes no rate-limit headers on any response (checked on both success and a 401) " +
      "and no quota-read endpoint. Its Rate Limits page documents two fixed ceilings — 120 " +
      "document upserts/minute (a write path this app doesn't call) and 10,000 Dust App runs/day " +
      "(the deprecated legacy Dust Apps surface this app doesn't implement) — and states only " +
      "that other endpoints MAY return 429, with no published number or counter for them.",
  },
};

export default quota;
