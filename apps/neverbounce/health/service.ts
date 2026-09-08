/**
 * Is NeverBounce up? — ZoomInfo's Atlassian Statuspage.
 *
 * Verified live 2026-09-06: `status.neverbounce.com` and
 * `neverbounce.statuspage.io` are both decoys — the former 301s straight to
 * `status.zoominfo.com` (NeverBounce is a ZoomInfo product) and the latter
 * 302s to Atlassian's own unclaimed-Statuspage marketing page. The real feed
 * is `https://status.zoominfo.com/api/v2/summary.json`, a genuine, claimed
 * Statuspage instance (`page.name: "ZoomInfo"`) that carries a component
 * literally named `NeverBounce` (id `tzcx0fl6mw4m`) among a dozen unrelated
 * ZoomInfo products (Sales, Enrich, Talent, Chorus, Datanyze, ...) — this
 * check reads only that one component, not the page-level rollup, since a
 * Sales or Talent incident says nothing about this app's API.
 *
 * `kind: "service"` / `scope: "app"` / `credential: "none"` (all defaults for
 * this kind) — the answer is identical for every Connection, so it is
 * computed once and shared, and it reports even before anyone has connected.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "status.zoominfo.com";

/** The one component on ZoomInfo's shared Statuspage this app's API maps to. */
const COMPONENT_NAME = "NeverBounce";

/** Statuspage's per-component vocabulary. */
const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const service: HealthCheckDefinition = {
  key: "service",
  title: "NeverBounce platform status",
  description: 'Atlassian Statuspage rollup for status.zoominfo.com, scoped to the "NeverBounce" ' +
    "component among ZoomInfo's shared page. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us
    // nothing about the vendor, and reporting that as an outage would lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      components?: Array<{ name?: string; status?: string }>;
    };

    const component = body.components?.find((c) => c.name === COMPONENT_NAME);
    if (!component) {
      return {
        state: "unknown",
        message: `no "${COMPONENT_NAME}" component found on ${STATUS_HOST}`,
      };
    }

    return {
      state: COMPONENT[component.status ?? ""] ?? "unknown",
      ttlSeconds: 60,
    };
  },
};

export default service;
