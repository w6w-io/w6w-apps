/**
 * Is Knack up?
 *
 * ## The status page is real. Verified three ways on 2026-09-05
 *
 * Knack publishes at **`status.knack.com`**, an Atlassian Statuspage —
 * confirmed by the page's own "Powered by Atlassian Statuspage" footer link.
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path                                   | Status | Bytes   |
 *   | --------------------------------------- | ------ | ------- |
 *   | `/api/v2/summary.json`                  | 200    | ~9,600  |
 *   | `/api/v2/zzz-not-real.json`              | **404**| **0**   |
 *
 * **(b) Does the page describe THIS product?**
 *
 *     "page": {"id": "w2mf2swvx7sh", "name": "Knack", "url": "https://status.knack.com"}
 *
 * and its components are Knack's own: `API`, `Builder`, `Live App`, `Flows`,
 * `Account Dashboard` (grouped under "Knack Features"), plus `Marketing Site
 * (www.knack.com)`, `Support Ticket Portal`, `Knowledge Base`, `Community
 * Forum`, `Product Requests & Changelog` (grouped under "Knack Services").
 *
 * **(c) Which component is THIS app?** The component literally named `API`
 * (id `39z0356ftqyz`) is what `api.knack.com` serves; `Builder` affects
 * schema/Object changes made in the Knack UI, not this app's requests;
 * `Live App` is Knack's own hosted front end. All are reported — a customer's
 * Live App and Builder being down is still useful context — but `API` is the
 * one this app's Actions and Auth actually depend on.
 *
 * ## Marketing/support components are reported, never mistaken for the API
 *
 * Unlike Apify's `External services` group (AWS, Stripe, npm — genuinely
 * upstream infrastructure), Knack's second group is the vendor's OWN
 * marketing site and support tooling. They are real Knack components, so they
 * are reported like any other, but keyed by the vendor's own component id so
 * a reader skimming names never mistakes `Community Forum` for the REST API.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Knack is SaaS-only —
 * there is no self-hosted Knack — so every Connection this app can hold runs
 * on exactly the infrastructure this page describes.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.knack.com/api/v2/summary.json";

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
  title: "Knack platform status",
  description:
    "Component status from status.knack.com. Covers the API, Builder, Live App and Flows, plus " +
    "Knack's own marketing site and support tooling.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.knack.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Knack — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.knack\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Knack's" };
    }

    // `group: true` rows are containers whose status merely mirrors their
    // children; reporting them would double-count every grouped component.
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
