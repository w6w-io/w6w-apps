/**
 * Is Trustpilot up?
 *
 * ## The status page is real, verified live on 2026-09-01
 *
 * `status.trustpilot.com` is a genuine Atlassian Statuspage, confirmed by fetching
 * `/api/v2/summary.json` directly (200, 5,239 bytes of Statuspage-shaped JSON) and reading
 * its self-identification:
 *
 *     "page": {"id": "vxc0wzpxmzsr", "name": "Trustpilot", "url": "https://status.trustpilot.com"}
 *
 * Its 14 components are Trustpilot's own: a "General Availability" group containing
 * **`APIs`** (this app's own dependency), `www.trustpilot.com`, `Business Portal` and
 * `TrustBoxes`; an "Other websites" group (`business.trustpilot.com`,
 * `legal.trustpilot.com`, `corporate.trustpilot.com`); an "invitation-reviews" group
 * (`default-template`, `custom template` — email delivery, not the API this app calls);
 * plus a standalone `emails` component. `status.indicator` is Trustpilot's own roll-up
 * across all of them and read as this check's verdict — deriving one from the component
 * list instead would report Trustpilot down because `corporate.trustpilot.com` (their
 * marketing site) is having a bad day, or `emails` (Trustpilot's own transactional mail,
 * unrelated to the Invitations API this app calls) is degraded.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Trustpilot is SaaS-only, so every
 * Connection this app can hold runs on exactly the infrastructure this page describes.
 *
 * `credential: "none"` is the default for `kind: "service"` and stated explicitly because
 * it is the precondition for the `network` widening below — a status host must never see
 * a Trustpilot API Key or OAuth token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.trustpilot.com/api/v2/summary.json";

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
  title: "Trustpilot platform status",
  description: "Component status from status.trustpilot.com — the API, the marketing/business " +
    "sites, invitation email delivery and TrustBoxes.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.trustpilot.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Trustpilot — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe at
    // someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.trustpilot\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Trustpilot's" };
    }

    // `group: true` rows are containers whose status merely mirrors their children.
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
