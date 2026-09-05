import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { regionFor } from "../lib/client.ts";

/**
 * Is Zuora up — for the connection's OWN region and cloud.
 *
 * Verified 2026-09-05: `zuora.statuspage.io` (`page.url: https://trust.zuora.com`)
 * is a real, claimed Statuspage instance whose components include, per
 * region/cloud GROUP, a `Production API` / `Sandbox API` / `Central Sandbox`
 * component — e.g. group "AMERICAS - CLOUD 1 (NA1) - *.na.zuora.com" has its
 * own `Production API`, distinct from the identically-named component under
 * "AMERICAS - CLOUD 2 (NA2) - www|rest.zuora.com". Component names repeat
 * across groups (same pattern as this pack's `amplitude`/`digitalocean` health
 * checks), so this check resolves the group matching THIS connection's region
 * first, then reads only that group's component — exactly as `cloudinary`'s
 * `service` check does for its per-datacentre components. An outage in
 * another region's cloud must not turn this connection red.
 *
 * `Central Sandbox` (the Developer & Central Sandbox environments) is one
 * environment Zuora lists once per region on the status page but the v1 API
 * reference names as "US"/"EU"/"APAC" without saying which underlying cloud
 * backs it; this app resolves the US Central Sandbox against the NA2 group
 * (documented assumption — see `lib/client.ts`'s `REGIONS` table).
 */
const STATUS_HOST = "zuora.statuspage.io";

const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

const service: HealthCheckDefinition = {
  key: "service",
  title: "Zuora platform status",
  description: "The regional API cloud this connection uses, read from Zuora's own status page.",
  kind: "service",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const region = regionFor((ctx.connection?.display as { region?: string } | undefined)?.region);

    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as
      | {
        components?: Array<
          { id?: string; name?: string; status?: string; group_id?: string | null }
        >;
      }
      | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    // Groups are components with `group: true` and no `group_id`; find the one
    // whose name carries this region's status-group token, e.g. "(NA1)".
    const groups = body.components.filter((c) =>
      (c as { group?: boolean }).group === true && !c.group_id
    );
    const group = groups.find((g) => new RegExp(`\\(${region.statusGroup}\\)`).test(g.name ?? ""));
    if (!group) {
      return {
        state: "unknown",
        message: `the status page no longer lists a ${region.statusGroup} region group`,
      };
    }

    const component = body.components.find((c) =>
      c.group_id === group.id && c.name === region.statusComponent
    );
    if (!component) {
      return {
        state: "unknown",
        message: `the status page no longer lists "${region.statusComponent}" under ${group.name}`,
      };
    }

    const state = STATES[String(component.status)] ?? "unknown";
    return {
      state,
      message: `${group.name} — ${component.name}: ${component.status}`,
      components: { [region.key]: { state, message: component.status } },
      ttlSeconds: 120,
    };
  },
};

export default service;
