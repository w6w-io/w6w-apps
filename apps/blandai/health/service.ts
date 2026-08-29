/**
 * Is Bland up?
 *
 * ## The status page is real, checked three ways on 2026-08-29
 *
 * Bland publishes at **`status.bland.ai`**, an Atlassian Statuspage.
 *
 * **(a) Content-type and body.** `GET /api/v2/summary.json` answers
 * `200 application/json` and parses as the Statuspage v2 schema — not the
 * ~127,700-byte HTML an unclaimed `*.statuspage.io` instance serves.
 *
 * **(b) Does the page describe THIS product?** Yes:
 *
 *     "page": { "id": "3ll4lx1hjypr", "name": "Bland AI", "url": "https://status.bland.ai" }
 *
 * **(c) Live top-level indicator**, measured the same day:
 *
 *     "status": { "indicator": "none", "description": "All Systems Operational" }
 *
 * ## Components repeat by name across regions — the same trap DigitalOcean and
 * Lever hit in this pack
 *
 * The page groups components by region (`United States`, and others), and
 * multiple regions each carry their own component literally named `API` (and
 * their own `AWS ec2-*` dependency rows) — measured 10 components on
 * 2026-08-29, several sharing the name `API`. A component is therefore only
 * identifiable by its vendor `id`, never by name alone; {@link componentKey}
 * keys on id (falling back to a name slug only if a future page ever omits
 * ids). Group container rows (`group: true`) are skipped — their status
 * merely mirrors their children, so counting both would double-report every
 * region.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`: Bland's phone-call
 * infrastructure is Bland-operated SaaS (no self-hosted deployment this app
 * can reach), so an incident here is evidence about every Connection.
 * `credential: "none"` is stated explicitly — the precondition for the
 * `network` widening below, so a status host never sees an API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.bland.ai/api/v2/summary.json";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
  scheduled_maintenances?: unknown[];
  status?: { indicator?: string; description?: string };
}

/** Statuspage's documented component vocabulary. */
export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
      return "ok";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
      return "degraded";
    case "major_outage":
      return "down";
    default:
      return "unknown";
  }
}

/** The page-level roll-up: `none`, `minor`, `major`, `critical`, `maintenance`. */
export function mapIndicator(indicator: string | undefined): HealthState {
  switch (indicator) {
    case "none":
      return "ok";
    case "minor":
    case "major":
    case "maintenance":
      return "degraded";
    case "critical":
      return "down";
    default:
      return "unknown";
  }
}

/**
 * Key a component by its vendor id, falling back to a name slug.
 *
 * The id survives the name collisions documented above; the fallback exists
 * only so a future page that drops ids still reports something.
 */
export function componentKey(component: StatusComponent, index: number): string {
  if (component.id) return component.id;
  if (component.name) {
    return `${
      component.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    }-${index}`;
  }
  return `component-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Bland platform status",
  description: "Component status from status.bland.ai, across every regional group Bland reports.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.bland.ai"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Bland — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.bland\.ai(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Bland's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
      // The name goes in the message even when healthy: the key is an opaque
      // vendor id, so without it a reader cannot tell which component this is.
      components[componentKey(node, index)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const indicator = body.status?.indicator;
    const state = indicator === undefined
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : mapIndicator(indicator);

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
