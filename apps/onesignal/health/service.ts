/**
 * Is OneSignal up?
 *
 * ## The status page is real, checked three ways on 2026-09-05
 *
 * `status.onesignal.com` is an Atlassian Statuspage.
 *
 * **(a) Not a catch-all.** `GET /api/v2/summary.json` answers `200` with
 * 2,855 bytes of JSON; a nonsense sibling path answers `404`.
 *
 * **(b) Self-identifies as this product.**
 * `"page": {"name": "OneSignal", "url": "https://status.onesignal.com/"}`.
 *
 * **(c) Names OneSignal's own product surfaces**, not a generic template: 9
 * components — `Push`, `Email`, `SMS`, `In-App Messages`, `Journeys`,
 * `Integrations`, `Analytics & Reporting`, `APIs & SDK Endpoints`,
 * `Dashboard / UI`.
 *
 * `credential: "none"` is the default for `kind: "service"`, stated
 * explicitly because it is the precondition for the `network` widening below
 * — a status host must never see an App API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.onesignal.com/api/v2/summary.json";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { url?: string };
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
  title: "OneSignal platform status",
  description: "Component status from status.onesignal.com — Push, Email, SMS, In-App Messages, " +
    "Journeys, Integrations, Analytics & Reporting, APIs & SDK Endpoints, and Dashboard / UI.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.onesignal.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)onesignal\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as OneSignal's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
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
