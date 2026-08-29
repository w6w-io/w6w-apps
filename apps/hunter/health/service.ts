import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Hunter up? — declared absent, honestly.
 *
 * Hunter's own homepage links to `status.hunter.io`, so a status page exists.
 * It is not, however, machine-readable: it is a client-rendered Nuxt/Vercel
 * single-page app, and it answers **200 for every path** with the identical
 * ~1,223-byte HTML shell (verified 2026-08-29 — `/api/v2/summary.json`,
 * `/api/v2/status.json` and `/api/v2/components.json` all came back
 * `content-type: text/html`, byte-identical). That is the SPA's own
 * client-side-routing fallback, not an API — there is no server-rendered JSON
 * behind any of those paths to parse.
 *
 * A lookalike also exists at `hunter.instatus.com` — `page.name` is literally
 * `"Hunter"` and `/summary.json` answers real JSON — but its component list
 * (`/components.json`) is `["Test", "App", "Website"]`. A component named
 * "Test" is the signature of an unclaimed or never-configured Instatus
 * default page, not an operator's live monitoring, so this app does not trust
 * it as Hunter's status even though the name matches.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, which outranks `ok` in a roll-up, so at any other
 * severity this declared absence would pin the App's verdict at `unknown`
 * forever. The derived `auth:api-key` check is the only automatable liveness
 * signal this app can offer.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Hunter platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.hunter.io is a client-rendered SPA that answers 200 with the same HTML shell for " +
      "every path (no JSON API behind /api/v2/summary.json, /status.json or /components.json, " +
      "verified 2026-08-29). A same-named page at hunter.instatus.com does serve real JSON, but " +
      'its components are ["Test", "App", "Website"] — an unconfigured Instatus default, ' +
      "not verifiable as Hunter's own operated monitoring. The derived `auth:api-key` check is " +
      "the only automatable liveness signal.",
  },
};

export default service;
