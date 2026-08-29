/**
 * Is Whop up?
 *
 * ## The status page is real, checked three ways on 2026-08-29
 *
 * `status.whop.com` answers Statuspage-shaped JSON, but its own Atom feed's
 * `<generator>` names **incident.io** — incident.io deliberately serves a
 * Statuspage-API-compatible surface for migrators, so the shape matching
 * Statuspage does not by itself prove anything; it was confirmed as Whop's own
 * page three ways instead:
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path                                   | Status  | Bytes | Notes |
 *   | --------------------------------------- | ------- | ----- | ----- |
 *   | `/api/v2/summary.json`                  | 200     | 817   | real component list |
 *   | `/api/v2/status.json`                   | 200     | 198   | page-level only |
 *   | `/api/v2/definitely-not-real-zzz.json`  | **404** | **0** | refused outright |
 *
 * **(b) Does the page describe THIS product?** Yes:
 *   `"page": {"name": "Whop", "url": "https://status.whop.com/"}`, and
 *   `/api/v2/incidents.json` lists Whop-specific incidents by name (e.g.
 *   "Errors Claiming Discord Roles") — not generic placeholder text.
 *
 * **(c) Do the components mean anything?** Three: `Website`, `Android App`,
 * `iOS App`. None is named "API" — this page does not promise anything about
 * `api.whop.com` in particular, only about the product as a whole — so the
 * page-level `status.indicator` (Whop's own roll-up) is what this check
 * trusts, exactly as for a Statuspage-shaped page. See {@link mapIndicator}.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Whop is SaaS-only —
 * there is no self-hosted Whop — so an incident here is evidence about every
 * Connection this app can hold.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below
 * — a status host must never see a Whop API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.whop.com/api/v2/summary.json";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
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
  title: "Whop platform status",
  description:
    "Component status from status.whop.com (Website, Android App, iOS App). None of these " +
    "components is the REST API specifically, so the page-level roll-up is what this check " +
    "trusts, matching how a Statuspage-shaped source is read across this pack.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.whop.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Whop — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect silently pointing this probe at
    // someone else's page — status.whop.com is served by a third-party
    // (incident.io) that hosts many customers' pages under lookalike paths.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.whop\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Whop's" };
    }
    if (body.page?.name && body.page.name !== "Whop") {
      return { state: "unknown", message: `status page self-identifies as "${body.page.name}"` };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name);
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
