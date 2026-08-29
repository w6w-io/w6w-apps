/**
 * Is Onfleet's own API up? — verified live 2026-08-29: `status.onfleet.com`
 * is a real Statuspage instance (page id `l92bng659fhp`, 21 components), and
 * `/api/v2/components.json` answers with real JSON, not a decoy.
 *
 * ## `API` decides the verdict; everything else is context
 *
 * The page lists 21 components — `Dashboard`, `API`, `Maps`, `iOS`,
 * `Android`, `Locations streaming`, `Locations storage`, `Search`, `ETA`,
 * `Route Optimization`, telephony/SMS proxies, and more — most of which this
 * app never touches. Only `API` is what every action here actually calls
 * through, so it alone decides `ok`/`degraded`/`down`. Everything else that
 * is degraded is still named in the message (a workflow reading `ETA` or
 * worker locations benefits from knowing `Locations streaming` is down, even
 * though the API call that reads it will still succeed with stale data).
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "status.onfleet.com";

/** Statuspage's component vocabulary, mapped onto our four states. */
const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Onfleet platform status",
  description:
    "Onfleet's own API — the one component every action here calls through. Other components " +
    "(Dashboard, Maps, driver apps, ETA, location streaming) are named when affected but do not " +
    "change the verdict.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as
      | { components?: Array<{ name?: string; status?: string; group?: boolean }> }
      | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    let apiState: HealthState | undefined;
    const otherBad: string[] = [];

    for (const c of body.components) {
      if (c.group === true) continue;
      const name = String(c.name ?? "");
      if (!name) continue;
      const state = STATES[String(c.status)] ?? "unknown";
      components[slug(name)] = { state, message: c.status };

      if (/^api$/i.test(name)) {
        apiState = state;
      } else if (c.status !== "operational") {
        otherBad.push(`${name}: ${c.status}`);
      }
    }

    if (apiState === undefined) {
      return {
        state: "unknown",
        message: "the status page no longer names an `API` component",
        components: Object.keys(components).length > 0 ? components : undefined,
      };
    }

    const parts = [apiState === "ok" ? "API operational" : `API: ${components["api"]?.message}`];
    if (otherBad.length > 0) parts.push(`also affected: ${otherBad.join(", ")}`);

    return {
      state: apiState,
      message: parts.join(" · "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
