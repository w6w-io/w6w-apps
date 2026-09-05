/**
 * Is Omnisend up?
 *
 * ## The status page is real. It was checked three ways on 2026-09-05
 *
 * Omnisend publishes at **`status.omnisend.com`**, an Atlassian Statuspage.
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path                                   | Status  | Bytes | notes                   |
 *   | --------------------------------------- | ------- | ----- | ------------------------ |
 *   | `/api/v2/summary.json`                  | 200     | 6,354 | full component tree      |
 *   | `/api/v2/status.json`                   | 200     | 216   | page-level indicator only|
 *   | `/api/v2/definitely-not-real-zzz.json`  | **404** | 0     | —                        |
 *
 * Three different answers, and the nonsense path is refused outright.
 *
 * **(b) Content-type AND body.** `application/json; charset=utf-8`, parsing
 * as the Statuspage v2 schema.
 *
 * **(c) Does the page describe THIS product?** Yes:
 *
 *     "page": { "id": "80nxcgd5stc9", "name": "Omnisend",
 *               "url": "https://status.omnisend.com" }
 *
 * and its components are Omnisend's own, grouped as `Channels` (Email, SMS,
 * Push Notifications), `Platforms` (Shopify, BigCommerce, WooCommerce, Wix)
 * and `Product Area` (API, Campaigns, Automation, App, Segments, Signup
 * Forms, Reporting, Integrations, Access) — the "API" component is what this
 * check ultimately cares about, but every component is reported since a
 * degraded `Automation` or `Campaigns` component is exactly what a workflow
 * relying on this app's actions to trigger those things needs to know about.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Omnisend is SaaS-only
 * — there is no self-hosted Omnisend — so an incident here is evidence about
 * every tenant.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below
 * — a status host must never see an Omnisend API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.omnisend.com/api/v2/summary.json";

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

/**
 * Statuspage's documented component vocabulary: `operational`,
 * `degraded_performance`, `partial_outage`, `major_outage`,
 * `under_maintenance`.
 */
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
 * Key a component by the vendor's id, falling back to a slug of the name.
 *
 * The id is stable across renames and is what the page's own incident
 * records reference. The fallback exists only so a future page that drops
 * ids still reports something rather than silently dropping rows.
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
  title: "Omnisend platform status",
  description:
    "Component status from status.omnisend.com. Covers Email, SMS, Push Notifications, the " +
    "store-platform connectors (Shopify, BigCommerce, WooCommerce, Wix), and the API, " +
    "Campaigns, Automation, App, Segments, Signup Forms, Reporting, Integrations and Access " +
    "components.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.omnisend.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Omnisend — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page — the failure mode where a healthy, claimed
    // status page belongs to an entirely different product.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.omnisend\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Omnisend's" };
    }

    // `group: true` rows are containers whose status merely mirrors their
    // children; reporting them would double-count every grouped service.
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
