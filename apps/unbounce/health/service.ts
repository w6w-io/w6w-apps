/**
 * Is Unbounce's Partner API up?
 *
 * ## The status page is real, verified 2026-08-30
 *
 * Unbounce publishes at **`status.unbounce.com`**, an Atlassian Statuspage —
 * `page.name` is `"Unbounce"`, `page.url` is `"https://status.unbounce.com"`,
 * and `/api/v2/summary.json` answers 13,898 bytes of real component data (not
 * one of the unclaimed-page decoys documented elsewhere in this pack).
 *
 * ## One component out of thirty-eight is this app
 *
 * The page lists 38 components, and most of them are not this integration:
 * `Main Web Site and Blog`, `Live Chat/Phone/Email Support`, `Smart Copy App`,
 * and — the largest group — two dozen individual `AWS *` rows (per-region
 * EC2/ELB/S3/RDS/SQS/SNS instances Unbounce itself depends on). Exactly one
 * component is named **`Partner API`**, and that is this app's own surface —
 * everything this app calls lives under `api.unbounce.com`, which the vendor's
 * own naming ties to "partner" integrations rather than the marketing site or
 * the page-builder web app.
 *
 * So the verdict below is **that one component's own state**, not the
 * page-level indicator: a `Main Web Site and Blog` outage, a `Live Chat
 * Support` incident, or one of the twenty-four AWS rows having a bad day says
 * nothing about whether `api.unbounce.com` itself answers, and reporting this
 * app "down" for any of those would be exactly the failure mode this pack's
 * `balena` and `lever` checks were written to avoid. Every other component is
 * still surfaced in `components` for detail — only the top-level verdict is
 * narrowed.
 *
 * Matched by **name**, not id: Statuspage component ids are opaque per-page
 * values, and matching the human-readable label is what survives the page
 * being reorganised without this check silently falling back to `unknown`
 * for the wrong reason.
 *
 * `credential: "none"` is the default for `kind: "service"`, stated
 * explicitly because it is the precondition for the `network` widening below
 * — a status host must never see an Unbounce credential.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.unbounce.com/api/v2/summary.json";

/** The vendor's own label for the component this app's traffic runs through. */
export const TARGET_COMPONENT_NAME = /partner api/i;

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

/** Key a component by its vendor id, falling back to a slug of its name. */
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
  title: "Unbounce Partner API status",
  description:
    'The status.unbounce.com "Partner API" component\'s own state — not the page-level ' +
    "indicator, which also covers the marketing site, live support channels and two dozen AWS " +
    "infrastructure rows that say nothing about api.unbounce.com.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.unbounce.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.unbounce\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Unbounce's" };
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

    const target = nodes.find((n) => TARGET_COMPONENT_NAME.test(n.name ?? ""));
    if (!target) {
      return {
        state: "unknown",
        message: 'status page no longer lists a "Partner API" component',
        components,
      };
    }

    const state = mapComponentStatus(target.status);
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;
    const notes: string[] = [];
    if (state !== "ok") notes.push(`Partner API: ${target.status}`);
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
