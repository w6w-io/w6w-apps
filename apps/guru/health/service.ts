/**
 * Is Guru up?
 *
 * ## The status page is real, checked three ways on 2026-09-05
 *
 * Guru publishes at **`status.getguru.com`**, an Atlassian Statuspage.
 *
 * **(a) Content-type AND body.** `/api/v2/summary.json` answers 200 with
 * `application/json`, parsing as the Statuspage v2 schema — 13 components
 * across two indicator states, not the ~127,700-byte unclaimed-Statuspage
 * HTML shell this pack has caught elsewhere.
 *
 * **(b) Does the page describe THIS product?** Yes: `"page": {"name": "Guru",
 * "url": "https://status.getguru.com"}`, and its components are named `API`,
 * `Databases`, `Web App`, `Servers`, `Extension`, `Slack bot`, `File Service
 * API`, `File Service Conversions`, `Analytics`, `Message Delivery`, plus
 * `Stripe API` and `Zuora Production API` (billing infrastructure Guru
 * depends on, not Guru's own knowledge-base surface) nested under an
 * `Infrastructure` group.
 *
 * **(c) Is this a catch-all?** No — `page.name` is exactly "Guru" and the
 * component list matches the product this app talks to, not a generic decoy.
 *
 * ## What shapes the code below
 *
 * Exactly one row has `group: true` (`Infrastructure`, id `y95dv7ks8fvr`) and
 * is skipped — reporting it would double-count its six children. The
 * page-level `status.indicator` is the verdict; components are the detail,
 * same as every other Statuspage-backed check in this pack.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Guru is SaaS-only —
 * there is no self-hosted Guru — so an incident here is evidence about every
 * Connection this app can hold.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.getguru.com/api/v2/summary.json";

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

/** Key a component by the vendor's id, falling back to a slug of the name. */
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
  title: "Guru platform status",
  description:
    "Component status from status.getguru.com. Covers the API, web app, servers, extension, " +
    "Slack bot, file service and analytics, plus the Stripe/Zuora billing infrastructure Guru " +
    "itself depends on.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.getguru.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Guru — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.getguru\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Guru's" };
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
