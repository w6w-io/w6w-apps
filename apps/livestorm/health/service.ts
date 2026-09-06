import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/**
 * Is Livestorm up? — Atlassian Statuspage, verified live 2026-09-06.
 *
 * `status.livestorm.co/api/v2/summary.json` answers `page.name: "Livestorm"`, `page.url:
 * "https://status.livestorm.co"` (matching the real vendor, not a decoy). The page defines
 * exactly ONE component, `"Livestorm app"`, which covers the whole product — including this
 * API, per the vendor's own description on the status page — so there is no narrower
 * component to select. `livestorm.statuspage.io` answers the identical page (a Statuspage
 * custom-domain alias), confirming this is the vendor's real, claimed page rather than an
 * unclaimed decoy.
 *
 * `kind: "service"` / `scope: "app"` (default) — one answer for every Connection.
 * `credential: "none"` (default) — reports even before anyone has connected.
 * `network.allow` widens egress for this hook only, to an unsigned status host.
 */
const STATUS_HOST = "status.livestorm.co";

const INDICATOR: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
};

const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const service: HealthCheckDefinition = {
  key: "service",
  title: "Livestorm platform status",
  description:
    `Atlassian Statuspage rollup for ${STATUS_HOST}. Livestorm publishes one component for ` +
    "the whole product, so this check cannot isolate the API from the rest of the app. " +
    "Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  credential: "none",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing about Livestorm.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    };

    const components: Record<string, { state: HealthState }> = {};
    for (const c of body.components ?? []) {
      if (!c.name || c.group) continue;
      const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      components[slug] = { state: COMPONENT[c.status ?? ""] ?? "unknown" };
    }

    const state = INDICATOR[body.status?.indicator ?? ""] ?? "unknown";
    return {
      state,
      message: body.status?.description,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
