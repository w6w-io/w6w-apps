import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Hedy up? — declared absent, on purpose.
 *
 * ## The one candidate found is a claimed page with no real content
 *
 * `https://hedy.statuspage.io/api/v2/summary.json` answers `200` with real
 * JSON (checked 2026-09-05): `page.name` is literally `"Hedy"`, so this is
 * not one of the unclaimed-Statuspage decoys this pack has hit before
 * (those answer ~127,700 bytes of HTML, not JSON). But its two components
 * are `"API (example)"` and `"Management Portal (example)"` — the exact
 * placeholder names Atlassian's Statuspage seeds a **freshly created, never
 * configured** page with. `status.indicator` is permanently `"none"` /
 * "All Systems Operational" because nothing has ever been wired to update
 * it. A page can be genuinely claimed by the vendor and still carry zero
 * real signal; this is that case; a green feed here would be free-floating
 * default content, not evidence about the API described in this app.
 *
 * `hedyai.statuspage.io` (the newer brand name) redirects to the generic
 * `statuspage.io` marketing page rather than resolving to a claimed page at
 * all, and no other machine-readable status source was found for either
 * `hedy.ai` or `hedy.bot`.
 *
 * ## Severity
 *
 * `informational` — required for a declared `unavailable`. `unknown`
 * outranks `ok` in a roll-up, so leaving this at the `degraded` default for
 * `kind: "service"` would pin the app's health verdict at `unknown` forever.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Hedy platform status",
  kind: "service",
  unavailable: {
    reason: "No real vendor status feed is published. hedy.statuspage.io is claimed (page.name " +
      '"Hedy") but its only two components are the unconfigured Statuspage defaults, "API ' +
      '(example)" and "Management Portal (example)" — never wired to report anything real. ' +
      "hedyai.statuspage.io redirects to the generic statuspage.io marketing page. No RSS/Atom " +
      "feed or other machine-readable source was found.",
  },
  severity: "informational",
};

export default service;
