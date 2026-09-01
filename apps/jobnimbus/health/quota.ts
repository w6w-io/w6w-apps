import type { HealthCheckDefinition } from "@w6w/types";

/**
 * JobNimbus publishes no readable rate-limit or quota headroom, so this
 * declares `unavailable` with a reason rather than pretending to probe.
 *
 * ## Verified 2026-09-01, two ways
 *
 * 1. **Nothing on the wire.** A live 401 response from `app.jobnimbus.com`
 *    (the same host every action calls) carried only `content-type`,
 *    `content-length`, `date`, the `access-control-*` CORS set, and
 *    CloudFront's own headers — no `X-RateLimit-*`, `RateLimit-*` or any
 *    similarly-named header of any kind.
 * 2. **Nothing in the documentation.** JobNimbus's own Postman collection
 *    ("Getting Started") documents the base URL, auth, common query
 *    parameters and query/filter syntax in detail, and says nothing about
 *    rate limits, throttling, or per-plan call ceilings anywhere in its text.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity a declared absence would pin this App's verdict at
 * `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "JobNimbus exposes no rate-limit or quota headroom of any kind: a live response " +
      "from app.jobnimbus.com carries no X-RateLimit-* or RateLimit-* header (checked signed " +
      "and unsigned), and the vendor's own Postman API documentation — the only public " +
      "reference for this API — does not mention rate limits, throttling or call ceilings " +
      "anywhere.",
  },
};

export default quota;
