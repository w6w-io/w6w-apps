import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Planning Center's own Statuspage instance.
 *
 * `status.planningcenteronline.com` — the domain someone would guess from the
 * API host — 302s to `status.planningcenter.com`, verified live (`curl -sIL`,
 * 2026-09-05). `status.planningcenter.com/api/v2/summary.json` answers the
 * standard Statuspage `summary.json` shape with `page.name: "Planning
 * Center"` and named components for every product this app touches (`API`,
 * `People`, `Calendar`, `Giving`, `Check-Ins`), so it is the real page for
 * this API, not a marketing-site decoy.
 *
 * Weighted on the `API` component specifically — the shared REST surface
 * every action in this app calls through — rather than the page's overall
 * indicator, which would also flip for a Church Center outage this app
 * cannot reach and has no action that depends on.
 */
const API_COMPONENT_ID = "sj9pmr5xnh0r";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Platform status (API)",
  kind: "service",
  covers: ["*"],
  network: { allow: ["status.planningcenter.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch("https://status.planningcenter.com/api/v2/summary.json");
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };
    const body = await res.json() as {
      components: Array<{ id: string; name: string; status: string }>;
    };
    const api = body.components.find((c) => c.id === API_COMPONENT_ID);
    if (!api) return { state: "unknown", message: "API component not found on status page" };

    const map = (status: string) =>
      status === "operational"
        ? "ok" as const
        : status === "major_outage"
        ? "down" as const
        : "degraded" as const; // degraded_performance, partial_outage, under_maintenance

    return {
      state: map(api.status),
      message: api.status === "operational" ? undefined : `${api.name}: ${api.status}`,
      ttlSeconds: 60,
    };
  },
};

export default service;
