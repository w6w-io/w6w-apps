/**
 * Is Cursor up?
 *
 * ## The status page is real, verified 2026-09-05
 *
 * `status.cursor.com/api/v2/summary.json` answers `200`, `application/json`,
 * 2,693 bytes — far below either known unclaimed-host signature (an unclaimed
 * `*.statuspage.io` is ~127,700 B of HTML, an unclaimed `*.instatus.com` is
 * ~216,800 B) — and its `page` object self-identifies:
 *
 *     "page": { "id": "0tp9ssgtptvs", "name": "Cursor",
 *               "url": "https://status.cursor.com" }
 *
 * ## But it names no Admin/Teams API component — so this check is capped
 *
 * Per HEALTHCHECKS.md: a vendor status page is not automatically a statement
 * about the API a Connection actually calls. This page's eight components,
 * read live, are: **Automations, Review Agents, CLI, Cloud Agents, cursor.com,
 * IDE, Origin, Grok Bot** — none of them named "API", "Admin API", or
 * `api.cursor.com`. The closest candidates (Automations, Cloud Agents) cover
 * the *Cloud Agents* product, a different surface from the Admin/Teams API
 * this app implements.
 *
 * So this check is real evidence about Cursor generally, but weak evidence
 * about `api.cursor.com` specifically — the same shape as `apps/grain` and
 * `apps/housecallpro` in this pack. Rather than declare the page unavailable
 * (it plainly is not) or trust it fully (it does not name this app's
 * dependency), the page-level indicator is read but the verdict is **capped
 * at `degraded`** — it can flag "something at Cursor is wrong, go look," but
 * never assert `down` for a component the page never claims to describe.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below
 * — a status host must never see a Cursor API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.cursor.com/api/v2/summary.json";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
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
 * Never report `down` from this page: it does not name the Admin/Teams API,
 * so the strongest verdict it can support is "something at Cursor is
 * degraded," never "the Admin API is down." See the module doc for why.
 */
export function capAtDegraded(state: HealthState): HealthState {
  return state === "down" ? "degraded" : state;
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
  title: "Cursor platform status",
  description:
    "Component status from status.cursor.com. Covers Cursor's product surfaces (Automations, " +
    "Cloud Agents, CLI, IDE, Review Agents, Origin, Grok Bot, cursor.com) — none of which is the " +
    "Admin/Teams API this app calls, so the verdict is capped at degraded rather than down.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.cursor.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Cursor — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.cursor\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Cursor's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = capAtDegraded(mapComponentStatus(node.status));
      components[componentKey(node, index)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const indicator = body.status?.indicator;
    const rolledUp = indicator === undefined
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : mapIndicator(indicator);
    const state = capAtDegraded(rolledUp);

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
    if (state !== rolledUp) notes.push("capped: this page does not name the Admin/Teams API");

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
