/**
 * Is Personio up?
 *
 * ## The status page is real, and names the exact component this app depends on
 *
 * Personio publishes at **`status.personio.de`**, an Atlassian Statuspage — verified
 * 2026-09-06 directly against `https://status.personio.de/api/v2/components.json`:
 *
 *     "page": { "id": "68kf6yfjnk2d", "name": "Personio Statuspage",
 *               "url": "https://status.personio.de" }
 *
 * Among its ~34 components (spanning Payroll, Apps/Recruiting, Core Platform and more)
 * is one literally named **"Public API"** (id `xbk8k300755q`), grouped under "Core
 * Platform" — the component that speaks for `api.personio.de`, distinct from
 * Recruiting, Payroll, or the web app's own login/UI components. This check reads the
 * page-level indicator for the overall verdict and reports the Public API component's
 * own status alongside it, so an incident in, say, Payroll integrations does not make
 * this Personnel Data API app look unhealthy.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated explicitly:
 * it is the precondition for the `network` widening below — a status host must never
 * see a Personio bearer token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.personio.de/api/v2/summary.json";

/** The "Public API" component id, under the "Core Platform" group. */
export const PUBLIC_API_COMPONENT_ID = "xbk8k300755q";

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

const service: HealthCheckDefinition = {
  key: "service",
  title: "Personio platform status",
  description: "Page-level status from status.personio.de, plus the 'Public API' " +
    "component specifically (the component that covers api.personio.de).",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.personio.de"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.personio\.de(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Personio's" };
    }

    const apiComponent = (body.components ?? []).find((c) => c.id === PUBLIC_API_COMPONENT_ID);
    const components: Record<string, HealthComponentReport> = {};
    if (apiComponent) {
      const state = mapComponentStatus(apiComponent.status);
      components[PUBLIC_API_COMPONENT_ID] = state === "ok"
        ? { state, message: "Public API" }
        : { state, message: `Public API: ${apiComponent.status}` };
    }

    const indicator = body.status?.indicator;
    const pageState = mapIndicator(indicator);
    const apiState = apiComponent ? mapComponentStatus(apiComponent.status) : "unknown";
    // The worse of the page-level roll-up and this component's own reading — an incident
    // affecting Public API specifically must not be masked by an otherwise-quiet page.
    const rank: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };
    const state = rank[apiState] > rank[pageState] ? apiState : pageState;

    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    const openIncidents = body.incidents?.length ?? 0;
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
