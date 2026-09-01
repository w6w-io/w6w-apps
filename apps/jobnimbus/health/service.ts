/**
 * Is JobNimbus up?
 *
 * ## Verified 2026-09-01
 *
 * JobNimbus publishes a real Atlassian Statuspage at `status.jobnimbus.com`:
 * `GET /api/v2/summary.json` answers 200 with 6,889 bytes of JSON, and the
 * page self-identifies (`page.id: "r8kw327v6276"`, `page.name: "JobNimbus"`,
 * `page.url: "https://status.jobnimbus.com"`).
 *
 * ## There is a component named exactly for this app's surface
 *
 * The page lists eleven components, and one of them —
 * `kc7n6zfckydv` / "Public API - Application Programming Interface" — is
 * unambiguously the surface this app calls. This check keys off that
 * component rather than the page-level indicator: on the day this was
 * verified the page-level indicator read `minor` ("Partially Degraded
 * Service") because "Web Application Performance" was degraded while the
 * Public API component itself was `operational` — the page-level roll-up
 * would have reported this app's dependency as degraded when it was not.
 *
 * The other ten components (Login, Email in/out, Mobile Application
 * Performance, Engage, QuickBooks Integration, Receiving Payments, Partner
 * Integrations, ...) are JobNimbus product surfaces this app does not call
 * and are reported for visibility but do not drive `state` on their own.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.jobnimbus.com/api/v2/summary.json";

/** The component whose name identifies the surface every action in this app calls. */
export const API_COMPONENT_ID = "kc7n6zfckydv";

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
  title: "JobNimbus platform status",
  description: 'The "Public API" component from status.jobnimbus.com, plus the rest of ' +
    "JobNimbus's own status page for visibility.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.jobnimbus.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about JobNimbus — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a redirect or rebrand silently pointing this probe at
    // someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.jobnimbus\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as JobNimbus's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const s = mapComponentStatus(node.status);
      components[componentKey(node, index)] = s === "ok"
        ? { state: s, message: node.name }
        : { state: s, message: `${node.name}: ${node.status}` };
    });

    // The verdict is the API component alone — see the module doc for why the
    // page-level indicator is the wrong signal for this app's surface.
    const apiComponent = nodes.find((n) => n.id === API_COMPONENT_ID);
    const state = apiComponent ? mapComponentStatus(apiComponent.status) : "unknown";

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const openIncidents = body.incidents?.length ?? 0;

    const notes: string[] = [];
    if (!apiComponent) notes.push('"Public API" component not found on the status page');
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
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
